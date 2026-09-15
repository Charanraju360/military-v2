"""Omniroute client implementing centralized API calls with documented hard timeouts."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.config import settings
from app.models.domain import Category

logger = logging.getLogger(__name__)


class OmnirouteClient:
    """Client for Omniroute LLM API services with strict timeouts."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.api_key = api_key or settings.omniroute_api_key
        self.base_url = (base_url or settings.omniroute_base_url).rstrip("/")
        self.default_timeout = timeout or float(settings.omniroute_timeout_seconds)

    async def classify_topic(
        self, title: str, text: str, timeout: float = 6.0
    ) -> tuple[bool, Category | None]:
        """Classify ambiguous article as military or non-military with category hint."""
        if not self.api_key or "example.com" in self.base_url:
            logger.warning(
                "Omniroute API key missing or example URL used; defaulting classification to non-military"
            )
            return False, None

        prompt = (
            "Analyze the following news article title and excerpt. Determine if it is related to military, "
            "defense, armed forces, warfare, geopolitics, peace deals, or military drills/exercises.\n\n"
            f"Title: {title}\n"
            f"Excerpt: {text[:500]}\n\n"
            "Respond in JSON format with two fields:\n"
            '1. "is_military": boolean (true or false)\n'
            '2. "category": string, exactly one of: "ATTACK", "GEOPOLITICS", "PEACE_DEAL", "AGREEMENT", "DRILL", "OTHER_MILITARY" (or null if is_military is false)\n'
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "omniroute-default",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
        }

        url = f"{self.base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.warning(
                        "Omniroute classification returned HTTP %d: %s",
                        response.status_code,
                        response.text,
                    )
                    return False, None

                data = response.json()
                content = data["choices"][0]["message"]["content"]

                cleaned_content = content.strip()
                if "```" in cleaned_content:
                    lines = cleaned_content.splitlines()
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    cleaned_content = "\n".join(lines).strip()

                parsed = json.loads(cleaned_content)
                is_military = bool(parsed.get("is_military", False))
                category_str = parsed.get("category")
                category = None
                if is_military and category_str:
                    try:
                        category = Category(category_str.upper())
                    except ValueError:
                        category = Category.OTHER_MILITARY

                return is_military, category

        except Exception as error:
            logger.warning("Omniroute classification call failed/timed out: %s", error)
            return False, None

    async def summarize_event(
        self, combined_text: str, timeout: float = 7.0
    ) -> tuple[str | None, Category | None]:
        """Generate a collective summary (<=120 words) and category for an event."""
        if not self.api_key or "example.com" in self.base_url:
            logger.warning(
                "Omniroute API key missing or example URL used; defaulting summary to None for fallback"
            )
            return None, None

        prompt = (
            "Summarize the following combined military news articles into a clear, factual collective event summary "
            "of at most 120 words. Also determine the primary military category.\n\n"
            f"Articles:\n{combined_text[:4000]}\n\n"
            "Respond in JSON format with two fields:\n"
            '1. "summary": string (collective summary <=120 words)\n'
            '2. "category": string, exactly one of: "ATTACK", "GEOPOLITICS", "PEACE_DEAL", "AGREEMENT", "DRILL", "OTHER_MILITARY"\n'
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "omniroute-default",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }

        url = f"{self.base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.warning("Omniroute summarization returned HTTP %d", response.status_code)
                    return None, None

                data = response.json()
                content = data["choices"][0]["message"]["content"]

                cleaned_content = content.strip()
                if "```" in cleaned_content:
                    lines = cleaned_content.splitlines()
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    cleaned_content = "\n".join(lines).strip()

                parsed = json.loads(cleaned_content)
                summary = parsed.get("summary")
                category_str = parsed.get("category")

                category = None
                if category_str:
                    try:
                        category = Category(category_str.upper())
                    except ValueError:
                        category = Category.OTHER_MILITARY

                return summary, category

        except Exception as error:
            logger.warning("Omniroute summarization call failed/timed out: %s", error)
            return None, None

    async def generate_grounded_answer(
        self, question: str, context_events: list[dict[str, str]], timeout: float = 7.0
    ) -> tuple[str | None, list[str]]:
        """Generate a grounded assistant answer using retrieved event summaries."""
        if not self.api_key or "example.com" in self.base_url:
            logger.warning(
                "Omniroute API key missing or example URL used; defaulting grounded answer to None for fallback"
            )
            return None, []

        context_str = "\n".join(
            f"Event ID [{e['id']}]: {e['summary']}" for e in context_events if e.get("summary")
        )

        prompt = (
            "You are an OSINT Military Intelligence Assistant. Answer the user's question based strictly "
            "on the following event summaries. Do not invent facts outside this context. "
            "Include the cited Event IDs in your citations list.\n\n"
            f"Event Summaries:\n{context_str}\n\n"
            f"Question: {question}\n\n"
            "Respond in JSON format with two fields:\n"
            '1. "answer": string (grounded answer)\n'
            '2. "citations": list of strings (cited event IDs, e.g. ["evt1", "evt2"])\n'
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "omniroute-default",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }

        url = f"{self.base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.warning("Omniroute grounded answer returned HTTP %d", response.status_code)
                    return None, []

                data = response.json()
                content = data["choices"][0]["message"]["content"]

                cleaned_content = content.strip()
                if "```" in cleaned_content:
                    lines = cleaned_content.splitlines()
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    cleaned_content = "\n".join(lines).strip()

                parsed = json.loads(cleaned_content)
                answer = parsed.get("answer")
                citations = parsed.get("citations", [])

                return answer, list(citations)

        except Exception as error:
            logger.warning("Omniroute grounded answer call failed/timed out: %s", error)
            return None, []
