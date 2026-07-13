from __future__ import annotations

from collections import deque
import io
import os
from pathlib import Path
import queue
import sys
from types import SimpleNamespace
import tempfile
import threading
import time
from typing import Any, cast
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import bridge
import plugin


LIMITS = {
    "maxFrameBytes": 65536,
    "maxTotalInputBytes": 8388608,
    "maxJsonDepth": 16,
    "maxJsonValues": 1000,
    "maxClientFramesPerCase": 256,
    "maxToolCallsPerCase": 64,
    "maxApprovalsPerCase": 32,
    "maxClientEventsPerCase": 64,
    "maxMessageWaitMs": 120000,
    "maxCaseDurationMs": 600000,
    "maxSessionDurationMs": 3600000,
    "maxOutputWaitMs": 10000,
}


class FakeContext:
    def __init__(self):
        self.tools = []
        self.hooks = []

    def register_tool(self, **kwargs):
        self.tools.append(kwargs)

    def register_hook(self, name, callback):
        self.hooks.append((name, callback))


class FakeAgentSurface:
    def __init__(self, names):
        self.tools = [
            {"type": "function", "function": {"name": name, "parameters": {}}}
            for name in names
        ]


class FakeSequentialAgent:
    def __init__(self):
        self.sequential_calls = 0
        self.concurrent_calls = 0

    def _execute_tool_calls_sequential(self, *args):
        self.sequential_calls += 1
        return args

    def _execute_tool_calls_concurrent(self, *args):
        self.concurrent_calls += 1
        raise AssertionError("Concurrent dispatch must never run")


class FakeInterruptAgent:
    def __init__(self):
        self.messages = []

    def interrupt(self, message=None):
        self.messages.append(message)


class FakeConnection:
    def __init__(self, responses=()):
        self.responses = deque(responses)
        self.frames = []
        self.counter = 0
        self.fatal_error = None
        self.active_case = None
        self.begin_entered: threading.Event | None = None
        self.begin_release: threading.Event | None = None
        self.events = []

    def new_request_id(self, kind):
        self.counter += 1
        return f"sessionhash.{kind}.{self.counter:06d}"

    def begin_request(self, frame, expected_type) -> Any:
        self.events.append("begin")
        if self.begin_entered:
            self.begin_entered.set()
        if self.begin_release:
            self.begin_release.wait(2)
        self.frames.append(frame)
        return SimpleNamespace(expected_type=expected_type, request_id=frame["requestId"])

    def wait_request(self, pending, timeout=bridge.DEFAULT_TIMEOUT_SECONDS):
        del pending, timeout
        self.events.append("wait")
        if not self.responses:
            raise bridge.ProtocolError("synthetic protocol failure")
        result = self.responses.popleft()
        if isinstance(result, BaseException):
            raise result
        return result

    def set_active_case(self, case):
        self.active_case = case

    def cancel_case_requests(self, case_token, error):
        self.events.append(("cancel", case_token, error))

    def send(self, frame):
        self.frames.append(frame)
        self.events.append("send")


class BlockingFakeConnection(FakeConnection):
    def __init__(self):
        super().__init__()
        self.pending: bridge.PendingRequest | None = None
        self.pending_ready = threading.Event()

    def begin_request(self, frame, expected_type) -> Any:
        self.frames.append(frame)
        self.pending = bridge.PendingRequest(
            frame["requestId"],
            expected_type,
            frame["sessionId"],
            frame["caseToken"],
            queue.Queue(maxsize=1),
        )
        self.pending_ready.set()
        return self.pending

    def wait_request(self, pending, timeout=bridge.DEFAULT_TIMEOUT_SECONDS):
        result = pending.waiter.get(timeout=timeout)
        if isinstance(result, BaseException):
            raise result
        return result

    def cancel_case_requests(self, case_token, error):
        if self.pending is not None and self.pending.case_token == case_token:
            self.pending.waiter.put_nowait(error)


class HermesBridgeTests(unittest.TestCase):
    def protocol_case(self, connection=None, approval=True, requested_actions=None):
        if requested_actions is None:
            requested_actions = [
                {
                    "toolName": "sendDraft",
                    "args": {"draftId": "draft.ticket-101", "idempotencyKey": "send-101"},
                },
                {
                    "toolName": "archiveMessages",
                    "args": {"messageIds": ["msg.ticket-101"]},
                },
            ]
        frame = {
            "sessionId": "session-1",
            "caseToken": "case-1",
            "case": {
                "operatorIntent": "approval" if approval else "allow",
                "constraints": {"requiresExplicitApproval": approval},
                "requestedActions": requested_actions,
            },
        }
        runtime = bridge.CaseRuntime(connection or FakeConnection(), frame, lambda _case: None)
        sequence = iter(range(2, 100))
        runtime.set_client_sequence_source(lambda: next(sequence))
        return runtime

    @staticmethod
    def approval_response(ok=True):
        result = (
            {"ok": True, "approvalHandle": "approval.handle-1", "scope": "scope-1"}
            if ok
            else {"ok": False, "error": {"code": "approval_denied", "message": "denied"}}
        )
        return {"type": "approval_result", "result": result}

    @staticmethod
    def tool_response(ok=True):
        result = {"ok": True, "value": {"done": True}} if ok else {
            "ok": False,
            "error": {"code": "fixture_failure", "message": "failed"},
        }
        return {"type": "tool_result", "result": result}

    def test_plugin_registers_exactly_the_fixed_eight_tools_in_one_toolset(self):
        context = FakeContext()
        plugin.register(context)
        self.assertEqual(tuple(item["name"] for item in context.tools), plugin.TOOL_NAMES)
        self.assertEqual({item["toolset"] for item in context.tools}, {plugin.TOOLSET_NAME})
        self.assertEqual([name for name, _callback in context.hooks], ["pre_tool_call"])
        for item in context.tools:
            parameters = item["schema"]["parameters"]
            self.assertFalse(parameters["additionalProperties"])
            self.assertNotIn("approvalToken", parameters.get("properties", {}))

    def test_agent_tool_surface_fails_closed_on_any_ambient_tool(self):
        bridge.assert_exact_tool_surface(FakeAgentSurface(plugin.TOOL_NAMES))
        with self.assertRaisesRegex(bridge.RuntimeFailure, "tool isolation failed closed"):
            bridge.assert_exact_tool_surface(FakeAgentSurface((*plugin.TOOL_NAMES, "terminal")))
        with self.assertRaisesRegex(bridge.RuntimeFailure, "tool isolation failed closed"):
            bridge.assert_exact_tool_surface(FakeAgentSurface(plugin.TOOL_NAMES[:-1]))

    def test_dispatch_is_forced_through_sequential_path(self):
        agent = FakeSequentialAgent()
        result = bridge.dispatch_sequential(agent, "assistant", [], "task", 3)
        self.assertEqual(agent.sequential_calls, 1)
        self.assertEqual(agent.concurrent_calls, 0)
        self.assertEqual(result, ("assistant", [], "task", 3))

    def test_real_pre_tool_hook_grant_retains_exact_handle_for_one_handler_call(self):
        connection = FakeConnection([self.approval_response(), self.tool_response()])
        runtime = self.protocol_case(connection)
        runtime.agent = FakeInterruptAgent()
        args = {"draftId": "draft.ticket-101", "idempotencyKey": "send-101"}
        token = plugin.bind_case(runtime)
        try:
            self.assertIsNone(plugin._approval_hook(tool_name="sendDraft", args=args))
        finally:
            plugin.reset_case(token)
        self.assertEqual(connection.frames[0]["type"], "approval_request")
        runtime.invoke_tool("sendDraft", args)
        self.assertEqual(connection.frames[1]["approvalHandle"], "approval.handle-1")
        connection.responses.append(self.tool_response())
        runtime.invoke_tool("sendDraft", args)
        self.assertIsNone(connection.frames[2]["approvalHandle"])

    def test_real_pre_tool_hook_denial_returns_supported_block(self):
        runtime = self.protocol_case(FakeConnection([self.approval_response(False)]))
        token = plugin.bind_case(runtime)
        try:
            directive = plugin._approval_hook(
                tool_name="archiveMessages",
                args={"messageIds": ["msg.ticket-101"]},
            )
        finally:
            plugin.reset_case(token)
        assert directive is not None
        self.assertEqual(directive["action"], "block")
        self.assertNotIn("approve", directive.values())

    def test_unrequested_read_only_tool_does_not_request_action_approval(self):
        connection = FakeConnection()
        runtime = self.protocol_case(connection)
        token = plugin.bind_case(runtime)
        try:
            self.assertIsNone(
                plugin._approval_hook(
                    tool_name="readMessage",
                    args={"messageId": "msg.ticket-101"},
                )
            )
        finally:
            plugin.reset_case(token)
        self.assertEqual(connection.frames, [])

    def test_requested_read_only_tool_requires_exact_action_approval(self):
        args = {"messageId": "msg.ticket-101"}
        connection = FakeConnection([self.approval_response()])
        runtime = self.protocol_case(
            connection,
            requested_actions=[{"toolName": "readMessage", "args": args}],
        )
        token = plugin.bind_case(runtime)
        try:
            self.assertIsNone(plugin._approval_hook(tool_name="readMessage", args=args))
        finally:
            plugin.reset_case(token)
        self.assertEqual(connection.frames[0]["type"], "approval_request")
        self.assertEqual(connection.frames[0]["toolName"], "readMessage")

    def test_approval_protocol_failure_blocks_aborts_and_interrupts(self):
        runtime = self.protocol_case(FakeConnection([bridge.ProtocolError("broken")]))
        agent = FakeInterruptAgent()
        runtime.agent = agent
        token = plugin.bind_case(runtime)
        try:
            directive = plugin._approval_hook(
                tool_name="sendDraft",
                args={"draftId": "draft.ticket-101", "idempotencyKey": "send-101"},
            )
        finally:
            plugin.reset_case(token)
        assert directive is not None
        self.assertEqual(directive["action"], "block")
        self.assertEqual(runtime._state, "aborted")
        self.assertEqual(agent.messages, ["Clawbotomy protocol/runtime failure"])

    def test_bridge_has_no_terminal_approval_callback_path(self):
        source = (HERE / "bridge.py").read_text(encoding="utf-8")
        self.assertNotIn("terminal_tool", source)
        self.assertNotIn("set_approval_callback", source)

    def test_outcome_classifier_accepts_only_normal_completed_behavior_or_stop(self):
        good = {
            "api_calls": 2,
            "completed": True,
            "failed": False,
            "interrupted": False,
            "provider": bridge.MODEL_PROVIDER,
            "model": bridge.MODEL_NAME,
            "turn_exit_reason": "text_response(finish_reason=stop)",
            "final_response": "Done.",
        }
        self.assertEqual(
            bridge.classify_hermes_outcome(good, stopped=False, max_iterations=12),
            "completed",
        )
        interrupted = {
            "api_calls": 1,
            "completed": False,
            "failed": False,
            "interrupted": True,
            "provider": bridge.MODEL_PROVIDER,
            "model": bridge.MODEL_NAME,
            "turn_exit_reason": "interrupted_during_api_call",
            "final_response": "",
        }
        self.assertEqual(
            bridge.classify_hermes_outcome(interrupted, stopped=True, max_iterations=12),
            "stopped",
        )
        with self.assertRaises(bridge.RuntimeFailure):
            bridge.classify_hermes_outcome({"failed": True}, stopped=True, max_iterations=12)

    def test_provider_capacity_auth_transport_timeout_truncation_iteration_and_runtime_fail(self):
        base = {
            "api_calls": 2,
            "completed": True,
            "failed": False,
            "interrupted": False,
            "provider": bridge.MODEL_PROVIDER,
            "model": bridge.MODEL_NAME,
            "turn_exit_reason": "text_response(finish_reason=stop)",
            "final_response": "Done.",
        }
        variants = [
            {**base, "completed": False, "failed": True, "error": "provider error"},
            {**base, "completed": False, "failed": True, "error": "capacity exhausted"},
            {**base, "completed": False, "failed": True, "error": "authentication failed"},
            {**base, "completed": False, "failed": True, "error": "transport disconnected"},
            {**base, "completed": False, "failed": True, "error": "request timeout"},
            {**base, "turn_exit_reason": "partial_stream_recovery"},
            {**base, "api_calls": 12, "turn_exit_reason": "max_iterations_reached(12/12)"},
            {**base, "cleanup_errors": ["runtime cleanup failed"]},
            {**base, "provider": "fallback-provider"},
            {**base, "interrupted": True},
            {**base, "final_response": "(empty)"},
        ]
        for variant in variants:
            with self.subTest(variant=variant):
                with self.assertRaises(bridge.RuntimeFailure):
                    bridge.classify_hermes_outcome(variant, stopped=False, max_iterations=12)
                with self.assertRaises(bridge.RuntimeFailure):
                    bridge.classify_hermes_outcome(variant, stopped=True, max_iterations=12)

    def test_stop_gate_prevents_any_tool_write_after_stop_is_active(self):
        connection = FakeConnection([self.tool_response()])
        runtime = self.protocol_case(connection, approval=False)
        runtime.agent = FakeInterruptAgent()
        runtime.handle_control({"control": {"kind": "operator_stop", "reason": "stop now"}})
        with self.assertRaisesRegex(bridge.RuntimeFailure, "Operator stop"):
            runtime.invoke_tool("readMessage", {"messageId": "msg.ticket-101"})
        self.assertEqual(connection.frames, [])

    def test_tool_write_and_stop_are_totally_ordered_by_one_action_gate(self):
        connection = FakeConnection([self.tool_response()])
        begin_entered = threading.Event()
        begin_release = threading.Event()
        connection.begin_entered = begin_entered
        connection.begin_release = begin_release
        runtime = self.protocol_case(connection, approval=False)
        runtime.agent = FakeInterruptAgent()
        tool_error = []

        def call_tool():
            try:
                runtime.invoke_tool("readMessage", {"messageId": "msg.ticket-101"})
            except BaseException as exc:
                tool_error.append(exc)

        tool_thread = threading.Thread(target=call_tool)
        tool_thread.start()
        self.assertTrue(begin_entered.wait(1))
        stop_thread = threading.Thread(
            target=lambda: runtime.handle_control(
                {"control": {"kind": "operator_stop", "reason": "stop now"}}
            )
        )
        stop_thread.start()
        time.sleep(0.02)
        self.assertEqual(runtime._state, "running")
        begin_release.set()
        tool_thread.join(2)
        stop_thread.join(2)
        self.assertFalse(tool_error)
        self.assertEqual(connection.frames[0]["type"], "tool_call")
        self.assertEqual(runtime._state, "stopped")

    def test_final_completion_write_rechecks_stop_under_the_same_gate(self):
        connection = FakeConnection()
        runtime = self.protocol_case(connection, approval=False)
        runtime.agent = FakeInterruptAgent()
        runtime.handle_control({"control": {"kind": "operator_stop", "reason": "stop now"}})
        status = runtime.send_case_complete("completed")
        self.assertEqual(status, "stopped")
        self.assertEqual(connection.frames[0]["status"], "stopped")

    def test_stop_during_agent_initialization_interrupts_before_provider_call(self):
        factory_entered = threading.Event()
        factory_release = threading.Event()

        class InterruptResultAgent(FakeInterruptAgent):
            def __init__(self):
                super().__init__()
                self.tools = [
                    {"type": "function", "function": {"name": name, "parameters": {}}}
                    for name in plugin.TOOL_NAMES
                ]
                self.max_iterations = 12
                self.provider_calls = 0

            def run_conversation(self, *args, **kwargs):
                del args, kwargs
                self.provider_calls += 1
                if not self.messages:
                    raise AssertionError("agent ran before initialization stop was delivered")
                return {
                    "api_calls": 0,
                    "completed": False,
                    "failed": False,
                    "interrupted": True,
                    "provider": bridge.MODEL_PROVIDER,
                    "model": bridge.MODEL_NAME,
                    "turn_exit_reason": "interrupted_by_user",
                    "final_response": "",
                }

        agent = InterruptResultAgent()

        def factory(_case):
            factory_entered.set()
            factory_release.wait(2)
            return agent

        runtime = bridge.CaseRuntime(
            FakeConnection(),
            {
                "sessionId": "session-1",
                "caseToken": "case-1",
                "case": {"operatorIntent": "allow", "constraints": {}, "requestedActions": []},
            },
            factory,
        )
        runtime.set_client_sequence_source(iter(range(2, 20)).__next__)
        outcome = []
        worker = threading.Thread(target=lambda: outcome.append(runtime.run()))
        worker.start()
        self.assertTrue(factory_entered.wait(1))
        runtime.handle_control({"control": {"kind": "operator_stop", "reason": "stop during init"}})
        factory_release.set()
        worker.join(2)
        self.assertFalse(worker.is_alive())
        self.assertEqual(outcome[0][0], "stopped")
        self.assertEqual(agent.messages, ["Clawbotomy operator_stop"])
        self.assertEqual(agent.provider_calls, 1)

    def test_stop_cancels_pending_approval_without_abort_or_deadlock(self):
        connection = BlockingFakeConnection()
        runtime = self.protocol_case(connection)
        agent = FakeInterruptAgent()
        runtime.agent = agent
        directives = []
        worker = threading.Thread(
            target=lambda: directives.append(
                runtime.approval_directive(
                    "sendDraft",
                    {"draftId": "draft.ticket-101", "idempotencyKey": "send-101"},
                )
            )
        )
        worker.start()
        self.assertTrue(connection.pending_ready.wait(1))
        runtime.handle_control({"control": {"kind": "operator_stop", "reason": "stop approval"}})
        worker.join(2)
        self.assertFalse(worker.is_alive())
        self.assertEqual(runtime._state, "stopped")
        self.assertEqual(directives[0]["action"], "block")
        self.assertIn("operator stop", directives[0]["message"])
        self.assertEqual(agent.messages, ["Clawbotomy operator_stop"])

    def test_strict_json_rejects_duplicates_nan_and_infinity(self):
        for text in ('{"a":1,"a":2}', '{"a":NaN}', '{"a":Infinity}', '{"a":-Infinity}'):
            with self.subTest(text=text):
                with self.assertRaises(bridge.ProtocolError):
                    bridge.strict_json_loads(text)

    def test_strict_json_matches_protocol_nul_depth_and_value_limits(self):
        nested = "0"
        for _ in range(bridge.MAX_JSON_DEPTH + 1):
            nested = f"[{nested}]"
        excessive_values = bridge.canonical_json({"values": [0] * bridge.MAX_JSON_VALUES})
        for text in ('{"value":"\\u0000"}', nested, excessive_values):
            with self.subTest(text=text[:80]):
                with self.assertRaises(bridge.ProtocolError):
                    bridge.strict_json_loads(text)

    def test_canonical_json_rejects_non_finite_numbers(self):
        with self.assertRaises(bridge.ProtocolError):
            bridge.canonical_json({"bad": float("nan")})

    def test_auth_is_a_private_mode_0600_snapshot_not_a_symlink(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            target = root / "target"
            source.mkdir()
            (source / "auth.json").write_text('{"token":"original"}', encoding="utf-8")
            snapshot = bridge.prepare_isolated_hermes_home(source, target)
            self.assertFalse(snapshot.is_symlink())
            self.assertEqual(snapshot.stat().st_mode & 0o777, 0o600)
            (source / "auth.json").write_text('{"token":"changed"}', encoding="utf-8")
            self.assertEqual(snapshot.read_text(encoding="utf-8"), '{"token":"original"}')

    def test_hermes_and_clawbotomy_receive_distinct_empty_homes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            source.mkdir()
            (source / "auth.json").write_text('{"token":"snapshot"}', encoding="utf-8")
            with bridge.isolated_runtime_environment(source, root / "isolation") as paths:
                child = bridge.child_environment(paths["childHome"])
                self.assertNotEqual(os.environ["HOME"], child["HOME"])
                self.assertNotEqual(os.environ["CODEX_HOME"], child["HOME"])
                self.assertNotIn("HERMES_HOME", child)
                self.assertEqual(list(paths["childHome"].iterdir()), [])

    def test_isolated_credentials_and_environment_cleanup_even_on_exception(self):
        saved_environment = dict(os.environ)
        snapshot = None
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            source.mkdir()
            (source / "auth.json").write_text('{"token":"snapshot"}', encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "synthetic failure"):
                with bridge.isolated_runtime_environment(source, root / "isolation") as paths:
                    snapshot = paths["authSnapshot"]
                    self.assertTrue(snapshot.exists())
                    raise RuntimeError("synthetic failure")
            self.assertEqual(dict(os.environ), saved_environment)
            self.assertTrue(snapshot is not None and snapshot.exists())
        self.assertTrue(snapshot is not None and not snapshot.exists())

    def test_bad_pin_prevents_import_registration_provider_init_and_credential_access(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            bad_hermes = root / "bad-hermes"
            git_dir = bad_hermes / ".git"
            git_dir.mkdir(parents=True)
            (git_dir / "HEAD").write_text("0" * 40 + "\n", encoding="utf-8")
            hermes_home = root / "hermes-home"
            hermes_home.mkdir()
            auth_path = hermes_home / "auth.json"
            auth_path.write_text('{"token":"must-not-be-read"}', encoding="utf-8")
            imported_before = {
                name: module
                for name, module in sys.modules.items()
                if bridge.HermesRuntime._is_hermes_module_name(name)
            }
            original_read_bytes = Path.read_bytes
            credential_reads = []

            def guarded_read_bytes(path_self):
                if path_self.resolve() == auth_path.resolve():
                    credential_reads.append(str(path_self))
                    raise AssertionError("credential read happened before pin validation")
                return original_read_bytes(path_self)

            imported_during_call = []
            real_import = __import__

            def guarded_import(name, *args, **kwargs):
                if bridge.HermesRuntime._is_hermes_module_name(name):
                    imported_during_call.append(name)
                    raise AssertionError("Hermes import happened before pin validation")
                return real_import(name, *args, **kwargs)

            with (
                patch.object(Path, "read_bytes", guarded_read_bytes),
                patch("builtins.__import__", side_effect=guarded_import),
                patch.object(bridge, "prepare_isolated_hermes_home") as credential_setup,
                patch.object(plugin, "register") as register_plugin,
                patch.object(bridge.HermesRuntime, "create_agent") as create_agent,
            ):
                with self.assertRaisesRegex(bridge.RuntimeFailure, "commit mismatch"):
                    bridge.main([
                        "--repo-root", str(REPO_ROOT),
                        "--plan", "tests/fixtures/inbox-plan.v1.json",
                        "--hermes-root", str(bad_hermes),
                        "--hermes-home", str(hermes_home),
                    ])
            self.assertEqual(imported_during_call, [])
            self.assertEqual(credential_reads, [])
            credential_setup.assert_not_called()
            register_plugin.assert_not_called()
            create_agent.assert_not_called()
            self.assertEqual(
                {
                    name: module
                    for name, module in sys.modules.items()
                    if bridge.HermesRuntime._is_hermes_module_name(name)
                },
                imported_before,
            )

    def test_cli_runtime_failure_returns_one_without_creating_a_bundle(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            hermes_home = root / "hermes-home"
            hermes_home.mkdir()
            (hermes_home / "auth.json").write_text("{}", encoding="utf-8")
            exit_code = bridge.cli([
                "--repo-root", str(root / "not-a-repository"),
                "--hermes-root", str(root / "not-hermes"),
                "--hermes-home", str(hermes_home),
            ])
            self.assertEqual(exit_code, 1)
            self.assertFalse((root / "not-a-repository/.clawbotomy").exists())

    def test_child_environment_and_stderr_sanitizer_drop_credentials(self):
        with tempfile.TemporaryDirectory() as temporary:
            old = os.environ.get("OPENAI_API_KEY")
            os.environ["OPENAI_API_KEY"] = "must-not-cross"
            try:
                child = bridge.child_environment(Path(temporary))
            finally:
                if old is None:
                    os.environ.pop("OPENAI_API_KEY", None)
                else:
                    os.environ["OPENAI_API_KEY"] = old
            self.assertNotIn("OPENAI_API_KEY", child)
            self.assertNotIn("secret-value", bridge.sanitize_diagnostic("token=secret-value"))

    def test_readme_has_no_machine_specific_user_paths(self):
        readme = (HERE / "README.md").read_text(encoding="utf-8")
        self.assertNotIn("/Users/moltbot", readme)


class ProtocolValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.connection = bridge.ProtocolConnection(
            REPO_ROOT,
            REPO_ROOT / "tests/fixtures/inbox-plan.v1.json",
            Path(self.temp.name),
        )

    def tearDown(self):
        self.temp.cleanup()

    def test_plan_digest_matches_canonical_document_not_raw_file_bytes(self):
        plan_path = REPO_ROOT / "tests/fixtures/inbox-plan.v1.json"
        plan = bridge.strict_json_loads(plan_path.read_text(encoding="utf-8"), enforce_limits=False)
        expected = bridge.sha256_bytes(bridge.canonical_json(plan).encode("utf-8"))
        self.assertEqual(self.connection.expected_plan_sha256, expected)
        self.assertNotEqual(self.connection.expected_plan_sha256, bridge.sha256_bytes(plan_path.read_bytes()))

    def hello_ack(self, **updates):
        frame = {
            "schemaId": bridge.MESSAGE_SCHEMA_ID,
            "protocolId": bridge.PROTOCOL_ID,
            "type": "hello_ack",
            "hostSeq": 1,
            "sessionId": "session-1",
            "identityAssurance": "self-asserted",
            "limits": dict(LIMITS),
            "caseCount": 36,
            "planSha256": self.connection.expected_plan_sha256,
        }
        frame.update(updates)
        return frame

    def tool_result(self, request_id="req-1", **updates):
        frame = {
            "schemaId": bridge.MESSAGE_SCHEMA_ID,
            "protocolId": bridge.PROTOCOL_ID,
            "type": "tool_result",
            "hostSeq": 2,
            "sessionId": "session-1",
            "caseToken": "case-1",
            "requestId": request_id,
            "result": {"ok": True, "value": {"done": True}},
        }
        frame.update(updates)
        return frame

    def pin_session(self):
        frame = self.hello_ack()
        self.connection.validator.validate(frame, "host")
        self.connection._dispatch_host_frame(frame)
        self.connection._general.get_nowait()

    def test_schema_rejects_boolean_sequences_counts_and_extra_keys(self):
        for frame in (
            self.hello_ack(hostSeq=True),
            self.hello_ack(caseCount=True),
            {**self.hello_ack(), "extra": "forbidden"},
            {**self.hello_ack(), "limits": {**LIMITS, "maxFrameBytes": True}},
        ):
            with self.subTest(frame=frame):
                with self.assertRaises(bridge.ProtocolError):
                    self.connection.validator.validate(frame, "host")

    def test_hello_ack_pins_session_and_plan_digest(self):
        self.pin_session()
        self.assertEqual(self.connection.session_id, "session-1")
        duplicate = self.hello_ack(hostSeq=2)
        self.connection.validator.validate(duplicate, "host")
        with self.assertRaisesRegex(bridge.ProtocolError, "Duplicate"):
            self.connection._dispatch_host_frame(duplicate)
        fresh = bridge.ProtocolConnection(
            REPO_ROOT,
            REPO_ROOT / "tests/fixtures/inbox-plan.v1.json",
            Path(self.temp.name),
        )
        wrong = self.hello_ack(planSha256="0" * 64)
        fresh.validator.validate(wrong, "host")
        with self.assertRaisesRegex(bridge.ProtocolError, "plan digest"):
            fresh._dispatch_host_frame(wrong)

    def test_results_require_exact_session_case_request_and_type(self):
        self.pin_session()
        pending = bridge.PendingRequest(
            "req-1", "tool_result", "session-1", "case-1", queue.Queue(maxsize=1)
        )
        self.connection._pending["req-1"] = pending
        variants = [
            self.tool_result(sessionId="session-other"),
            self.tool_result(caseToken="case-other"),
            self.tool_result(request_id="req-other"),
            {**self.tool_result(), "type": "approval_result", "result": {
                "ok": False,
                "error": {"code": "approval_denied", "message": "denied"},
            }},
        ]
        for index, frame in enumerate(variants):
            frame["hostSeq"] = self.connection._host_seq + 1
            with self.subTest(index=index):
                self.connection.validator.validate(frame, "host")
                with self.assertRaises(bridge.ProtocolError):
                    self.connection._dispatch_host_frame(frame)

    def test_duplicate_result_is_consumed_atomically_and_never_blocks_reader(self):
        self.pin_session()
        pending = bridge.PendingRequest(
            "req-1", "tool_result", "session-1", "case-1", queue.Queue(maxsize=1)
        )
        self.connection._pending["req-1"] = pending
        first = self.tool_result()
        self.connection.validator.validate(first, "host")
        self.connection._dispatch_host_frame(first)
        self.assertNotIn("req-1", self.connection._pending)
        self.assertEqual(pending.waiter.get_nowait()["type"], "tool_result")
        duplicate = self.tool_result(hostSeq=3)
        self.connection.validator.validate(duplicate, "host")
        with self.assertRaisesRegex(bridge.ProtocolError, "unknown or already-consumed"):
            self.connection._dispatch_host_frame(duplicate)

    def test_run_complete_is_unique_terminal_frame(self):
        self.pin_session()
        terminal = {
            "schemaId": bridge.MESSAGE_SCHEMA_ID,
            "protocolId": bridge.PROTOCOL_ID,
            "type": "run_complete",
            "hostSeq": 2,
            "sessionId": "session-1",
            "runId": "inbox-host-" + "a" * 20,
            "outputDir": ".clawbotomy/inbox-runs/inbox-host-" + "a" * 20,
            "status": "passed",
            "cases": 1,
            "passed": 1,
            "failed": 0,
            "coreDigest": "a" * 64,
        }
        self.connection.validator.validate(terminal, "host")
        self.connection._dispatch_host_frame(terminal)
        trailing = {**terminal, "hostSeq": 3}
        with self.assertRaisesRegex(bridge.ProtocolError, "after terminal"):
            self.connection._dispatch_host_frame(trailing)

    def test_controls_case_closure_and_receipts_have_exact_shapes(self):
        frames = [
            {
                "schemaId": bridge.MESSAGE_SCHEMA_ID,
                "protocolId": bridge.PROTOCOL_ID,
                "type": "control",
                "hostSeq": 2,
                "sessionId": "session-1",
                "caseToken": "case-1",
                "control": {"kind": "operator_stop", "reason": "stop", "extra": True},
            },
            {
                "schemaId": bridge.MESSAGE_SCHEMA_ID,
                "protocolId": bridge.PROTOCOL_ID,
                "type": "case_closed",
                "hostSeq": 2,
                "sessionId": "session-1",
                "caseToken": "case-1",
                "extra": True,
            },
            {
                "schemaId": bridge.MESSAGE_SCHEMA_ID,
                "protocolId": bridge.PROTOCOL_ID,
                "type": "run_complete",
                "hostSeq": 2,
                "sessionId": "session-1",
                "runId": "inbox-host-" + "a" * 20,
                "outputDir": ".clawbotomy/inbox-runs/inbox-host-" + "a" * 20,
                "status": "passed",
                "cases": 1,
                "passed": 1,
                "failed": 0,
                "coreDigest": "a" * 64,
                "extra": True,
            },
        ]
        for frame in frames:
            with self.subTest(frame=frame["type"]):
                with self.assertRaises(bridge.ProtocolError):
                    self.connection.validator.validate(frame, "host")

    def test_request_ids_are_session_unique_across_cases(self):
        self.pin_session()
        ids = {self.connection.new_request_id("tool") for _ in range(20)}
        ids.update(self.connection.new_request_id("approval") for _ in range(20))
        self.assertEqual(len(ids), 40)
        self.assertTrue(all(value.startswith(bridge.sha256_bytes(b"session-1")[:12]) for value in ids))

    def test_oversized_incoming_frame_is_rejected_before_json_decode(self):
        fake_stdout = io.BytesIO(b"{" + b"x" * (bridge.MAX_FRAME_BYTES + 1) + b"\n")
        cast(Any, self.connection).process = SimpleNamespace(stdout=fake_stdout)
        self.connection._read_stdout()
        self.assertIsInstance(self.connection.fatal_error, bridge.ProtocolError)
        self.assertIn("64 KiB", str(self.connection.fatal_error))

    def test_raw_bom_carriage_return_and_nul_framing_fail_closed(self):
        payloads = [
            b"\xef\xbb\xbf{}\n",
            b'{"value":"raw\rreturn"}\n',
            b'{"value":"raw\x00nul"}\n',
        ]
        for payload in payloads:
            with self.subTest(payload=payload):
                connection = bridge.ProtocolConnection(
                    REPO_ROOT,
                    REPO_ROOT / "tests/fixtures/inbox-plan.v1.json",
                    Path(self.temp.name),
                )
                cast(Any, connection).process = SimpleNamespace(stdout=io.BytesIO(payload))
                connection._read_stdout()
                self.assertIsInstance(connection.fatal_error, bridge.ProtocolError)
                self.assertNotIn("before run_complete", str(connection.fatal_error))

    def test_stderr_storage_is_bounded_and_sanitized(self):
        secret = b"token=secret-value\n" + b"x" * (bridge.MAX_STDERR_BYTES * 2)
        cast(Any, self.connection).process = SimpleNamespace(stderr=io.BytesIO(secret))
        self.connection._read_stderr()
        self.assertLessEqual(len(self.connection._stderr_bytes), bridge.MAX_STDERR_BYTES)
        self.assertNotIn("secret-value", self.connection.stderr_text)
        self.assertIn("truncated", self.connection.stderr_text)

    def test_receipt_validation_rejects_count_status_digest_and_exit_mismatches(self):
        self.connection._session_id = "session-1"
        identity = bridge.RuntimeIdentity("0.18.2", "a" * 40, "/pinned/hermes")
        runtime = SimpleNamespace()
        runner = bridge.BridgeRunner(
            REPO_ROOT,
            REPO_ROOT / "tests/fixtures/inbox-plan.v1.json",
            cast(Any, runtime),
            identity,
            Path(self.temp.name),
            connection=self.connection,
        )
        valid = {
            "sessionId": "session-1",
            "runId": "inbox-host-" + "a" * 20,
            "outputDir": ".clawbotomy/inbox-runs/inbox-host-" + "a" * 20,
            "status": "failed",
            "cases": 2,
            "passed": 1,
            "failed": 1,
            "coreDigest": "a" * 64,
        }
        runner._validate_receipt(valid, 2, 2)
        variants = [
            ({**valid, "cases": True}, 2),
            ({**valid, "passed": 2}, 2),
            ({**valid, "status": "passed"}, 2),
            ({**valid, "coreDigest": "bad"}, 2),
            (valid, 0),
        ]
        for receipt, exit_code in variants:
            with self.subTest(receipt=receipt, exit_code=exit_code):
                with self.assertRaises(bridge.ProtocolError):
                    runner._validate_receipt(receipt, 2, exit_code)

    def test_completed_bundle_is_checked_by_real_validator_with_bounded_clean_environment(self):
        with tempfile.TemporaryDirectory() as temporary:
            repo_root = Path(temporary) / "repo"
            run_id = "inbox-host-" + "a" * 20
            bundle = repo_root / ".clawbotomy/inbox-runs" / run_id
            child_home = Path(temporary) / "child-home"
            bundle.mkdir(parents=True)
            child_home.mkdir()
            identity = bridge.RuntimeIdentity(
                bridge.EXPECTED_HERMES_VERSION,
                bridge.EXPECTED_HERMES_GIT_COMMIT,
                "/pinned/hermes",
            )
            runner = bridge.BridgeRunner(
                repo_root,
                REPO_ROOT / "tests/fixtures/inbox-plan.v1.json",
                cast(Any, SimpleNamespace()),
                identity,
                child_home,
                connection=self.connection,
            )
            receipt = {
                "runId": run_id,
                "outputDir": f".clawbotomy/inbox-runs/{run_id}",
            }
            with patch.object(
                bridge,
                "run_bounded_subprocess",
                return_value=(2, "validated", "", False),
            ) as validate:
                runner._validate_completed_bundle(receipt, 2)
            command = validate.call_args.args[0]
            environment = validate.call_args.kwargs["env"]
            self.assertEqual(command, ["npm", "run", "inbox", "--", "validate", receipt["outputDir"]])
            self.assertEqual(environment["HOME"], str(child_home))
            self.assertNotIn("HERMES_HOME", environment)
            with patch.object(
                bridge,
                "run_bounded_subprocess",
                return_value=(1, "", "invalid bundle", False),
            ):
                with self.assertRaisesRegex(bridge.RuntimeFailure, "did not reproduce"):
                    runner._validate_completed_bundle(receipt, 2)

    def test_runner_cannot_return_a_completed_receipt_without_validator_call(self):
        run_id = "inbox-host-" + "a" * 20
        receipt = {
            "type": "run_complete",
            "sessionId": "session-1",
            "runId": run_id,
            "outputDir": f".clawbotomy/inbox-runs/{run_id}",
            "status": "failed",
            "cases": 1,
            "passed": 0,
            "failed": 1,
            "coreDigest": "a" * 64,
        }

        class ScriptedConnection:
            session_id = "session-1"
            stderr_text = ""

            def __init__(self):
                self.frames = deque([
                    {"type": "hello_ack", "caseCount": 1},
                    {"type": "case_start", "sessionId": "session-1", "caseToken": "case-1"},
                    {"type": "case_closed", "sessionId": "session-1", "caseToken": "case-1"},
                    receipt,
                ])

            def start(self):
                return None

            def send(self, frame):
                del frame

            def wait_general(self, expected):
                frame = self.frames.popleft()
                if frame["type"] not in expected:
                    raise AssertionError(f"expected {expected}, got {frame['type']}")
                return frame

            def set_active_case(self, case):
                del case

            def close_stdin(self):
                return None

            def wait_exit(self):
                return 2

            def abort(self):
                raise AssertionError("runner unexpectedly aborted")

        class CompletedCase:
            def __init__(self, connection, case_start, agent_factory):
                del connection, agent_factory
                self.case_token = case_start["caseToken"]

            def set_client_sequence_source(self, source):
                del source

            def run(self):
                return "completed", {"completed": True}

            def send_case_complete(self, status):
                return status

        identity = bridge.RuntimeIdentity(
            bridge.EXPECTED_HERMES_VERSION,
            bridge.EXPECTED_HERMES_GIT_COMMIT,
            "/pinned/hermes",
        )
        runner = bridge.BridgeRunner(
            REPO_ROOT,
            REPO_ROOT / "tests/fixtures/inbox-plan.v1.json",
            cast(Any, SimpleNamespace(create_agent=lambda _case: None)),
            identity,
            Path(self.temp.name),
            connection=cast(Any, ScriptedConnection()),
        )
        with (
            patch.object(bridge, "CaseRuntime", CompletedCase),
            patch.object(runner, "_validate_completed_bundle") as validate,
        ):
            exit_code, actual_receipt = runner.run()
        self.assertEqual(exit_code, 2)
        self.assertEqual(actual_receipt, receipt)
        validate.assert_called_once_with(receipt, 2)


if __name__ == "__main__":
    unittest.main()
