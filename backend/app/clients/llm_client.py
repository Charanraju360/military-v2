"""LLM gateway for Qwen primary, OpenRouter secondary, and structured fallback paths."""

from __future__ import annotations

import json
import logging
from typing import Any, Literal

import httpx

from app.config import settings
from app.models.domain import AnswerSource, Category, SummarySource

logger = logging.getLogger(__name__)

ProviderName = Literal["qwen_primary", "openrouter_secondary"]


class LLMClient:
    """Centralized LLM client for the redesigned provider chain."""

    def __init__(self) -> None:
        self._providers: list[dict[str, Any]] = [
            {
                "name": "qwen_primary",
                "base_url": settings.qwen_base_url,
                "api_key": settings.qwen_api_key,
                "model": settings.qwen_model,
                "timeout": settings.qwen_timeout_seconds,
            },
            {
                "name": "openrouter_secondary",
                "base_url": settings.openrouter_base_url,
                "api_key": settings.openrouter_api_key,
                "model": settings.openrouter_model,
                "timeout": settings.openrouter_timeout_seconds,
            },
        ]

    async def classify_topic(
        self, title: str, text: str, timeout: float = 6.0
    ) -> tuple[bool, Category | None]:
        """Classify ambiguous articles using Qwen then OpenRouter."""

        prompt = (
            "Classify this news article for a military/defense OSINT pipeline.\n"
            "Return JSON only with fields: is_military boolean, category string or null.\n"
            "Allowed categories: ATTACK, GEOPOLITICS, PEACE_DEAL, AGREEMENT, DRILL, OTHER_MILITARY.\n\n"
            f"Title: {title}\n"
            f"Excerpt: {text[:800]}"
        )
        for provider in self._available_providers(timeout):
            parsed = await self._chat_json(provider, prompt, temperature=0.0)
            if parsed is None:
                continue
            is_military = bool(parsed.get("is_military", False))
            category = self._parse_category(parsed.get("category")) if is_military else None
            return is_military, category
        return False, None

    async def synthesize_event(
        self, workspace: dict[str, Any], timeout: float = 7.0
    ) -> tuple[dict[str, Any] | None, SummarySource | None]:
        """Generate structured event synthesis with provider fallback."""

        prompt = (
            "You are synthesizing a military OSINT event from structured evidence.\n"
            "Use only the evidence provided. Preserve uncertainty and conflicts.\n"
            "Return JSON only with fields: summary, category, claims, timeline, conflicts, "
            "locations, uncertainty_statements. Do not select top sentences.\n\n"
            f"EVENT_WORKSPACE_JSON:\n{json.dumps(workspace, default=str)[:12000]}"
        )
        for provider in self._available_providers(timeout):
            parsed = await self._chat_json(provider, prompt, temperature=0.2)
            if not parsed or not parsed.get("summary"):
                continue
            source = (
                SummarySource.QWEN_PRIMARY
                if provider["name"] == "qwen_primary"
                else SummarySource.OPENROUTER_SECONDARY
            )
            return parsed, source
        return None, None

    async def generate_grounded_answer(
        self, question: str, event_evidence: list[dict[str, Any]], timeout: float = 7.0
    ) -> tuple[str | None, list[str], AnswerSource | None]:
        """Generate an event-grounded assistant answer using provider fallback."""

        prompt = (
            "Answer the question using only the retrieved event evidence. "
            "Mention conflicts or uncertainty when present. Return JSON only with fields: answer, citations.\n\n"
            f"QUESTION: {question}\n"
            f"EVENT_EVIDENCE_JSON:\n{json.dumps(event_evidence, default=str)[:12000]}"
        )
        for provider in self._available_providers(timeout):
            parsed = await self._chat_json(provider, prompt, temperature=0.2)
            if not parsed or not parsed.get("answer"):
                continue
            source = (
                AnswerSource.QWEN_PRIMARY
                if provider["name"] == "qwen_primary"
                else AnswerSource.OPENROUTER_SECONDARY
            )
            citations = parsed.get("citations") or []
            return str(parsed["answer"]), [str(c) for c in citations], source
        return None, [], None

    def _available_providers(self, override_timeout: float | None = None) -> list[dict[str, Any]]:
        providers: list[dict[str, Any]] = []
        for provider in self._providers:
            if not provider.get("base_url") or not provider.get("model"):
                continue
            if provider["name"] == "openrouter_secondary" and not provider.get("api_key"):
                continue
            provider = dict(provider)
            configured = float(provider.get("timeout") or 30.0)
            if configured > 0:
                provider["timeout"] = configured
            elif override_timeout is not None:
                provider["timeout"] = float(override_timeout)
            else:
                provider["timeout"] = 30.0
            providers.append(provider)
        return providers


    async def _chat_json(
        self, provider: dict[str, Any], prompt: str, *, temperature: float
    ) -> dict[str, Any] | None:
        base_url = str(provider["base_url"]).rstrip("/")
        if not base_url.endswith("/v1"):
            url = f"{base_url}/v1/chat/completions"
        else:
            url = f"{base_url}/chat/completions"

        headers = {"Content-Type": "application/json"}
        if provider.get("api_key"):
            headers["Authorization"] = f"Bearer {provider['api_key']}"
        payload = {
            "model": provider["model"],
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=float(provider["timeout"])) as client:
                response = await client.post(url, headers=headers, json=payload)
            if response.status_code != 200:
                logger.warning("%s LLM call returned HTTP %s: %s", provider["name"], response.status_code, response.text[:200])
                return None
            data = response.json()
            message = data.get("choices", [{}])[0].get("message", {})
            content = message.get("content") or ""
            return self._parse_json_content(content)
        except Exception as error:
            logger.warning("%s LLM call failed/timed out: %s", provider["name"], error)
            return None

    def _parse_json_content(self, content: str) -> dict[str, Any] | None:
        if not content:
            return None
        cleaned = content.strip()
        if "```" in cleaned:
            cleaned = "\n".join(
                line for line in cleaned.splitlines() if not line.strip().startswith("```")
            ).strip()
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        # Robust extraction: find first '{' and matching/last '}'
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(cleaned[start : end + 1])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

        return None

    def _parse_category(self, value: Any) -> Category:
        if isinstance(value, str):
            try:
                return Category(value.upper())
            except ValueError:
                return Category.OTHER_MILITARY
        return Category.OTHER_MILITARY

