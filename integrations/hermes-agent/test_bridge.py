from __future__ import annotations

import os
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import bridge
import plugin


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


class FakeConnection:
    def __init__(self):
        self.requests = []

    def request(self, frame, expected_type, timeout=bridge.DEFAULT_TIMEOUT_SECONDS):
        self.requests.append((frame, expected_type, timeout))
        return {
            "type": "approval_result",
            "result": {
                "ok": True,
                "approvalHandle": "approval.handle-1",
                "scope": "scope-1",
            },
        }


class FakeInterruptAgent:
    def __init__(self):
        self.messages = []

    def interrupt(self, message=None):
        self.messages.append(message)


class HermesBridgeTests(unittest.TestCase):
    def protocol_case(self, connection=None):
        frame = {
            "sessionId": "session-1",
            "caseToken": "case-1",
            "case": {
                "operatorIntent": "approval",
                "constraints": {"requiresExplicitApproval": True},
            },
        }
        runtime = bridge.CaseRuntime(connection or FakeConnection(), frame, lambda _case: None)
        sequence = iter(range(2, 100))
        runtime.set_client_sequence_source(lambda: next(sequence))
        return runtime

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

    def test_approval_handle_binds_to_exact_arguments_and_is_consumed_once(self):
        connection = FakeConnection()
        runtime = self.protocol_case(connection)
        args = {"draftId": "draft.ticket-101", "idempotencyKey": "send-101"}
        runtime.note_approval_intent("sendDraft", args)
        self.assertEqual(runtime.request_approval(), "once")
        sent_frame = connection.requests[0][0]
        self.assertEqual(sent_frame["type"], "approval_request")
        self.assertEqual(sent_frame["arguments"], args)
        self.assertNotIn("approvalToken", sent_frame["arguments"])
        self.assertIsNone(runtime.consume_approval_handle("sendDraft", {**args, "idempotencyKey": "other"}))
        self.assertEqual(runtime.consume_approval_handle("sendDraft", args), "approval.handle-1")
        self.assertIsNone(runtime.consume_approval_handle("sendDraft", args))

    def test_operator_stop_interrupts_the_active_agent_and_blocks_later_tools(self):
        runtime = self.protocol_case()
        agent = FakeInterruptAgent()
        runtime.agent = agent
        runtime.handle_control({
            "control": {"kind": "operator_stop", "reason": "fixture stop"},
        })
        self.assertEqual(agent.messages, ["Clawbotomy operator_stop"])
        with self.assertRaisesRegex(bridge.RuntimeFailure, "Operator stop"):
            runtime.invoke_tool("sendDraft", {
                "draftId": "draft.ticket-101",
                "idempotencyKey": "send-101",
            })

    def test_clawbotomy_child_environment_excludes_provider_credentials(self):
        old = os.environ.get("OPENAI_API_KEY")
        os.environ["OPENAI_API_KEY"] = "must-not-cross-child-boundary"
        try:
            child = bridge.child_environment()
        finally:
            if old is None:
                os.environ.pop("OPENAI_API_KEY", None)
            else:
                os.environ["OPENAI_API_KEY"] = old
        self.assertNotIn("OPENAI_API_KEY", child)
        self.assertNotIn("HERMES_HOME", child)


if __name__ == "__main__":
    unittest.main()
