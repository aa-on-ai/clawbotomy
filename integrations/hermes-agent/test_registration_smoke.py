from __future__ import annotations

import os
from pathlib import Path
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import bridge
import plugin


@unittest.skipUnless(
    os.environ.get("CLAWBOTOMY_HERMES_ROOT") and os.environ.get("CLAWBOTOMY_HERMES_HOME"),
    "set CLAWBOTOMY_HERMES_ROOT and CLAWBOTOMY_HERMES_HOME for the pinned runtime smoke",
)
class PinnedHermesRegistrationSmoke(unittest.TestCase):
    def test_real_pinned_hermes_registers_exactly_eight_tools(self):
        hermes_root = Path(os.environ["CLAWBOTOMY_HERMES_ROOT"]).resolve(strict=True)
        hermes_home = Path(os.environ["CLAWBOTOMY_HERMES_HOME"]).resolve(strict=True)
        with tempfile.TemporaryDirectory(prefix="clawbotomy-runtime-smoke-") as runtime_temporary:
            runtime = bridge.HermesRuntime(
                hermes_root,
                Path(runtime_temporary) / "verified-source",
            )
            try:
                identity = runtime.preflight()
                self.assertEqual(identity.version, bridge.EXPECTED_HERMES_VERSION)
                self.assertEqual(identity.git_commit, bridge.EXPECTED_HERMES_GIT_COMMIT)
                self.assertRegex(identity.source_tree_sha256, r"^[a-f0-9]{64}$")
                with tempfile.TemporaryDirectory(prefix="clawbotomy-registration-smoke-") as temporary:
                    with bridge.isolated_runtime_environment(Path(temporary)) as isolation:
                        self.assertFalse((isolation["hermesHome"] / "auth.json").exists())
                        runtime.initialize()
                        self.assertFalse((isolation["hermesHome"] / "auth.json").exists())
                        isolation["authSnapshot"] = bridge.attach_isolated_oauth(
                            hermes_home,
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


if __name__ == "__main__":
    unittest.main()
