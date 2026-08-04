from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import bridge
import plugin


PLACEHOLDER_AUTH_ENABLED = os.environ.get("CLAWBOTOMY_HERMES_TEST_PLACEHOLDER_AUTH") == "1"


@unittest.skipUnless(
    os.environ.get("CLAWBOTOMY_HERMES_ROOT")
    and (os.environ.get("CLAWBOTOMY_HERMES_HOME") or PLACEHOLDER_AUTH_ENABLED),
    "set CLAWBOTOMY_HERMES_ROOT plus CLAWBOTOMY_HERMES_HOME or the explicit test-only placeholder-auth flag",
)
class PinnedHermesRegistrationSmoke(unittest.TestCase):
    def setUp(self):
        self.hermes_root = Path(os.environ["CLAWBOTOMY_HERMES_ROOT"]).resolve(strict=True)
        configured_home = os.environ.get("CLAWBOTOMY_HERMES_HOME")
        if configured_home:
            self.hermes_home = Path(configured_home).resolve(strict=True)
            return

        self.assertTrue(PLACEHOLDER_AUTH_ENABLED)
        temporary = tempfile.TemporaryDirectory(prefix="clawbotomy-placeholder-auth-")
        self.addCleanup(temporary.cleanup)
        self.hermes_home = Path(temporary.name)
        auth_path = self.hermes_home / "auth.json"
        auth_path.write_text(
            json.dumps({
                "version": 1,
                "providers": {
                    "openai-codex": {
                        "tokens": {
                            "access_token": "test-only-placeholder-token",
                            "refresh_token": "test-only-placeholder-refresh",
                        },
                        "auth_mode": "oauth",
                    },
                },
                "active_provider": "openai-codex",
            }),
            encoding="utf-8",
        )
        os.chmod(auth_path, 0o600)

    def test_real_pinned_hermes_registers_exactly_eight_tools(self):
        with tempfile.TemporaryDirectory(prefix="clawbotomy-runtime-smoke-") as runtime_temporary:
            runtime = bridge.HermesRuntime(
                self.hermes_root,
                Path(runtime_temporary) / "verified-source",
            )
            try:
                identity = runtime.preflight()
                self.assertEqual(identity.version, bridge.EXPECTED_HERMES_VERSION)
                self.assertEqual(identity.git_commit, bridge.EXPECTED_HERMES_GIT_COMMIT)
                self.assertRegex(identity.source_tree_sha256, r"^[a-f0-9]{64}$")
                self.assertTrue(
                    {"utils", "plugins", "hermes_logging"} <= runtime.protected_module_roots
                )
                with tempfile.TemporaryDirectory(prefix="clawbotomy-registration-smoke-") as temporary:
                    with bridge.isolated_runtime_environment(Path(temporary)) as isolation:
                        self.assertFalse((isolation["hermesHome"] / "auth.json").exists())
                        runtime.initialize()
                        self.assertFalse((isolation["hermesHome"] / "auth.json").exists())
                        isolation["authSnapshot"] = bridge.attach_isolated_oauth(
                            self.hermes_home,
                            isolation["hermesHome"],
                        )
                        self.assertFalse(isolation["authSnapshot"].is_symlink())
                        self.assertEqual(isolation["authSnapshot"].stat().st_mode & 0o777, 0o600)
                        agent = runtime.create_agent(None)
                        bridge.assert_exact_tool_surface(agent)
                        self.assertEqual(
                            bridge.tool_names_from_agent(agent),
                            tuple(sorted(plugin.TOOL_NAMES)),
                        )
                        self.assertEqual(agent.enabled_toolsets, [plugin.TOOLSET_NAME])
                        self.assertTrue(agent.skip_context_files)
                        self.assertIsNone(agent._session_db)
            finally:
                runtime.make_snapshot_removable()

    def test_real_preloaded_utils_fails_before_oauth_registration_or_agent_init(self):
        auth_path = (self.hermes_home / "auth.json").resolve(strict=True)
        utils_path = (self.hermes_root / "utils.py").resolve(strict=True)
        with tempfile.TemporaryDirectory(prefix="clawbotomy-root-probe-") as probe_temporary:
            probe = bridge.HermesRuntime(self.hermes_root, Path(probe_temporary) / "unused-snapshot")
            manifest = probe._load_tree_manifest(bridge.EXPECTED_HERMES_GIT_COMMIT)
            protected_roots = probe._derive_protected_module_roots(manifest)
        for name in tuple(sys.modules):
            if name.partition(".")[0] in protected_roots:
                sys.modules.pop(name, None)
        spec = importlib.util.spec_from_file_location("utils", utils_path)
        if spec is None or spec.loader is None:
            self.fail("Pinned utils.py did not produce an importable module spec")
        module = importlib.util.module_from_spec(spec)
        previous_utils = sys.modules.get("utils")
        before_names = set(sys.modules)
        sys.modules["utils"] = module
        credential_reads = []
        original_read_bytes = Path.read_bytes

        def guarded_read_bytes(path_self):
            if path_self.resolve() == auth_path:
                credential_reads.append(str(path_self))
                raise AssertionError("OAuth was read before preloaded-module rejection")
            return original_read_bytes(path_self)

        try:
            spec.loader.exec_module(module)
            with (
                patch.object(Path, "read_bytes", guarded_read_bytes),
                patch.object(bridge, "attach_isolated_oauth") as attach_oauth,
                patch.object(plugin, "register") as register_plugin,
                patch.object(bridge.HermesRuntime, "create_agent") as create_agent,
            ):
                with self.assertRaisesRegex(bridge.RuntimeFailure, "already loaded.*utils"):
                    bridge.main([
                        "--repo-root", str(HERE.parents[1]),
                        "--plan", "tests/fixtures/inbox-plan.v1.json",
                        "--hermes-root", str(self.hermes_root),
                        "--hermes-home", str(self.hermes_home),
                    ])
            self.assertEqual(credential_reads, [])
            attach_oauth.assert_not_called()
            register_plugin.assert_not_called()
            create_agent.assert_not_called()
        finally:
            for name in set(sys.modules) - before_names:
                sys.modules.pop(name, None)
            if previous_utils is None:
                sys.modules.pop("utils", None)
            else:
                sys.modules["utils"] = previous_utils


if __name__ == "__main__":
    unittest.main()
