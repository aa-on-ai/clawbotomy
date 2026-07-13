"""Project-local Hermes plugin exposing only Clawbotomy's mock Inbox tools."""

from __future__ import annotations

import contextvars
import json
from typing import Any

TOOLSET_NAME = "clawbotomy_inbox"
TOOL_NAMES = (
    "searchMessages",
    "readMessage",
    "createDraft",
    "sendDraft",
    "archiveMessages",
    "trashMessages",
    "permanentlyDeleteMessages",
    "restoreMessages",
)

_ACTIVE_CASE: contextvars.ContextVar[Any | None] = contextvars.ContextVar(
    "clawbotomy_hermes_active_case",
    default=None,
)


def bind_case(case: Any):
    """Bind one protocol case to the current Hermes execution context."""
    return _ACTIVE_CASE.set(case)


def reset_case(token) -> None:
    _ACTIVE_CASE.reset(token)


def active_case() -> Any:
    case = _ACTIVE_CASE.get()
    if case is None:
        raise RuntimeError("No active Clawbotomy protocol case is bound.")
    return case


def _tool_handler(tool_name: str, args: dict[str, Any], **_: Any) -> str:
    if not isinstance(args, dict):
        raise TypeError("Mock Inbox tool arguments must be an object.")
    if "approvalToken" in args:
        raise ValueError("approvalToken is reserved and must never leave the bridge.")
    result = active_case().invoke_tool(tool_name, args)
    return json.dumps(result, ensure_ascii=False, separators=(",", ":"))


def _approval_hook(*, tool_name: str = "", args: Any = None, **_: Any):
    """Escalate only a public-envelope approval boundary through Hermes."""
    if tool_name not in TOOL_NAMES or not isinstance(args, dict):
        return None
    case = _ACTIVE_CASE.get()
    if case is None or not case.requires_approval(tool_name, args):
        return None
    case.note_approval_intent(tool_name, args)
    return {
        "action": "approve",
        "message": "The public case envelope requires explicit approval for this mock Inbox action.",
        "rule_key": case.approval_rule_key(tool_name, args),
    }


def _object_schema(properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": properties,
        "required": required,
    }


def tool_schemas() -> dict[str, dict[str, Any]]:
    synthetic_id = {"type": "string", "minLength": 1, "maxLength": 120}
    message_ids = {
        "type": "array",
        "minItems": 1,
        "maxItems": 50,
        "uniqueItems": True,
        "items": synthetic_id,
    }
    schemas = {
        "searchMessages": _object_schema(
            {
                "query": {"type": "string", "minLength": 1, "maxLength": 200},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50},
            },
            ["query", "limit"],
        ),
        "readMessage": _object_schema({"messageId": synthetic_id}, ["messageId"]),
        "createDraft": _object_schema(
            {
                "inReplyTo": synthetic_id,
                "to": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 10,
                    "uniqueItems": True,
                    "items": {
                        "type": "string",
                        "pattern": r"^[^@\s]+@[^@\s]+\.test$",
                        "maxLength": 240,
                    },
                },
                "subject": {"type": "string", "minLength": 1, "maxLength": 200},
                "body": {"type": "string", "minLength": 1, "maxLength": 2000},
            },
            ["inReplyTo", "to", "subject", "body"],
        ),
        "sendDraft": _object_schema(
            {
                "draftId": synthetic_id,
                "idempotencyKey": {"type": "string", "minLength": 1, "maxLength": 160},
            },
            ["draftId", "idempotencyKey"],
        ),
    }
    for name in (
        "archiveMessages",
        "trashMessages",
        "permanentlyDeleteMessages",
        "restoreMessages",
    ):
        schemas[name] = _object_schema({"messageIds": message_ids}, ["messageIds"])
    return schemas


def register(ctx) -> None:
    """Register the fixed toolset and its native Hermes approval hook."""
    descriptions = {
        "searchMessages": "Search the current synthetic Clawbotomy Inbox fixture.",
        "readMessage": "Read one synthetic message from the current fixture.",
        "createDraft": "Create a draft in the synthetic fixture only.",
        "sendDraft": "Send a synthetic fixture draft; never contacts a real mailbox.",
        "archiveMessages": "Archive synthetic fixture messages.",
        "trashMessages": "Move synthetic fixture messages to recoverable trash.",
        "permanentlyDeleteMessages": "Permanently delete synthetic fixture messages.",
        "restoreMessages": "Restore synthetic fixture messages from trash.",
    }
    schemas = tool_schemas()
    for tool_name in TOOL_NAMES:
        ctx.register_tool(
            name=tool_name,
            toolset=TOOLSET_NAME,
            schema={
                "name": tool_name,
                "description": descriptions[tool_name],
                "parameters": schemas[tool_name],
            },
            handler=lambda args, _name=tool_name, **kwargs: _tool_handler(
                _name,
                args,
                **kwargs,
            ),
        )
    ctx.register_hook("pre_tool_call", _approval_hook)
