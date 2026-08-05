#!/usr/bin/env python3
"""Provider-free provenance and tool-registration probe for the supported Hermes pin."""

from __future__ import annotations

import argparse
from contextlib import ExitStack
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
from unittest.mock import patch


HERE = Path(__file__).resolve().parent
INTEGRATION_ROOT = HERE.parent / "integrations" / "hermes-agent"
if str(INTEGRATION_ROOT) not in sys.path:
    sys.path.insert(0, str(INTEGRATION_ROOT))

import bridge  # noqa: E402
import plugin  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hermes-root", required=True)
    parser.add_argument("--expected-version", required=True)
    parser.add_argument("--expected-python-version", required=True)
    parser.add_argument("--expected-commit", required=True)
    parser.add_argument("--expected-tree-sha256", required=True)
    return parser.parse_args()


def write_placeholder_auth(home: Path) -> None:
    home.mkdir(mode=0o700)
    target = home / "auth.json"
    target.write_text(
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
    os.chmod(target, 0o600)


def main() -> int:
    options = parse_args()
    hermes_root = Path(options.hermes_root).resolve(strict=True)
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    if python_version != options.expected_python_version:
        raise RuntimeError("Python runtime did not match the Hermes support policy")
    network_attempts: list[str] = []

    def deny_socket_connect(_socket, address):
        network_attempts.append(type(address).__name__)
        raise RuntimeError("Hermes compatibility probe forbids network connections")

    def deny_create_connection(address, *args, **kwargs):
        network_attempts.append(type(address).__name__)
        raise RuntimeError("Hermes compatibility probe forbids network connections")

    with tempfile.TemporaryDirectory(prefix="clawbotomy-hermes-current-pin-") as temporary:
        temporary_root = Path(temporary)
        placeholder_home = temporary_root / "placeholder-auth"
        write_placeholder_auth(placeholder_home)
        runtime = bridge.HermesRuntime(
            hermes_root,
            temporary_root / "verified-source",
        )
        try:
            with ExitStack() as stack:
                stack.enter_context(patch.object(socket.socket, "connect", deny_socket_connect))
                stack.enter_context(patch.object(socket, "create_connection", deny_create_connection))
                identity = runtime.preflight()
                if identity.version != options.expected_version:
                    raise RuntimeError("Hermes version did not match the support policy")
                if identity.git_commit != options.expected_commit:
                    raise RuntimeError("Hermes Git commit did not match the support policy")
                if identity.source_tree_sha256 != options.expected_tree_sha256:
                    raise RuntimeError("Hermes source tree did not match the support policy")

                with bridge.isolated_runtime_environment(temporary_root / "isolation") as isolation:
                    runtime.initialize()
                    isolation["authSnapshot"] = bridge.attach_isolated_oauth(
                        placeholder_home,
                        isolation["hermesHome"],
                    )
                    agent = runtime.create_agent(None)
                    bridge.assert_exact_tool_surface(agent)
                    tool_names = list(bridge.tool_names_from_agent(agent))
                    if tool_names != sorted(plugin.TOOL_NAMES):
                        raise RuntimeError("Hermes registered an unexpected tool surface")
                    if agent.enabled_toolsets != [plugin.TOOLSET_NAME]:
                        raise RuntimeError("Hermes enabled an unexpected toolset")
                    if not agent.skip_context_files or agent._session_db is not None:
                        raise RuntimeError("Hermes isolation controls did not remain enabled")

            if network_attempts:
                raise RuntimeError("Hermes attempted a network connection during the provider-free probe")
            document = {
                "schemaId": "clawbotomy.hermes-current-pin-probe/v1",
                "runtime": identity.public(),
                "clientId": bridge.CLIENT_ID,
                "bridgeVersion": bridge.BRIDGE_VERSION,
                "pythonVersion": python_version,
                "pythonImplementation": sys.implementation.name,
                "implementationSha256": bridge.implementation_digest(INTEGRATION_ROOT, identity),
                "configurationSha256": bridge.safe_configuration_digest(identity),
                "toolset": plugin.TOOLSET_NAME,
                "toolNames": tool_names,
                "providerExecutionInvoked": False,
                "providerRequests": 0,
                "networkConnectAttempts": 0,
                "placeholderAuth": True,
            }
            print(json.dumps(document, sort_keys=True, separators=(",", ":")))
            return 0
        finally:
            runtime.make_snapshot_removable()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Hermes current-pin probe failed: {bridge.sanitize_diagnostic(error)}", file=sys.stderr)
        raise SystemExit(1)
