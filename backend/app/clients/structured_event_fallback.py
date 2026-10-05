"""Deterministic event synthesis fallback for the redesigned architecture."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
import re
from typing import Any

from app.models.domain import Category, SummarySource


class StructuredEventFallback:
    """Build structured event intelligence from stored evidence without LLM calls."""

    _number_claim_pattern = re.compile(
        r"\b(?P<value>\d{1,4})\s+(?P<aspect>aircraft|jets|missiles|drones|ships|troops|soldiers|casualties|tanks)\b",
        re.IGNORECASE,
    )

    def build_workspace(
        self,
        *,
        event_id: str,
        articles: list[Any],
        entities: list[Any],
        sources_by_id: dict[str, Any],
    ) -> dict[str, Any]:
        """Assemble claims, timeline, conflicts, and provenance for an event."""

        entity_items = [
            {"text": ent.text, "type": ent.type, "article_id": ent.article_id}
            for ent in entities
        ]
        locations = sorted({e["text"] for e in entity_items if e["type"] == "LOCATION"})
        source_refs: list[dict[str, Any]] = []
        claims: list[dict[str, Any]] = []
        timeline: list[dict[str, Any]] = []

        for article in articles:
            source = sources_by_id.get(article.source_id)
            source_refs.append(
                {
                    "article_id": article.id,
                    "source_id": article.source_id,
                    "source_name": source.name if source else "Unknown Source",
                    "title": article.title,
                    "url": article.url,
                    "published_at": article.published_at.isoformat()
                    if article.published_at
                    else None,
                }
            )
            if article.published_at:
                timeline.append(
                    {
                        "time": article.published_at.isoformat(),
                        "description": f"Report published: {article.title}",
                        "article_ids": [article.id],
                        "claim_ids": [],
                        "time_type": "publication_time",
                    }
                )

            claim_ids = self._extract_numeric_claims(article, claims)
            for item in timeline:
                if item.get("article_ids") == [article.id]:
                    item["claim_ids"] = claim_ids

        conflicts = self._detect_conflicts(claims, source_refs)
        uncertainty_statements = [
            conflict["uncertainty_statement"] for conflict in conflicts if conflict.get("uncertainty_statement")
        ]

        return {
            "event_id": event_id,
            "claims": claims,
            "timeline": sorted(timeline, key=lambda item: item.get("time") or ""),
            "conflicts": conflicts,
            "locations": locations,
            "entities": entity_items,
            "source_refs": source_refs,
            "uncertainty_statements": uncertainty_statements,
        }

    def synthesize(
        self,
        *,
        workspace: dict[str, Any],
        articles: list[Any],
        majority_category: Category,
    ) -> dict[str, Any]:
        """Create a structured local event summary from evidence fields."""

        article_count = len(articles)
        source_names = sorted(
            {
                ref["source_name"]
                for ref in workspace.get("source_refs", [])
                if ref.get("source_name")
            }
        )
        locations = workspace.get("locations", [])
        conflicts = workspace.get("conflicts", [])
        timeline = workspace.get("timeline", [])

        subject = f"{article_count} reports"
        if source_names:
            subject += f" from {len(source_names)} source"
            subject += "" if len(source_names) == 1 else "s"

        category_text = majority_category.value.replace("_", " ").lower()
        location_text = f" involving {', '.join(locations[:3])}" if locations else ""
        time_text = ""
        if timeline:
            first_time = timeline[0].get("time")
            latest_time = timeline[-1].get("time")
            time_text = f" between {first_time} and {latest_time}" if first_time != latest_time else f" at {latest_time}"

        summary_parts = [
            f"{subject} describe a {category_text} event{location_text}{time_text}."
        ]
        if conflicts:
            summary_parts.append(conflicts[0]["uncertainty_statement"])
        elif workspace.get("claims"):
            summary_parts.append(
                f"The event record preserves {len(workspace['claims'])} structured claim(s) with article provenance."
            )
        else:
            summary_parts.append("The event record is based on article metadata, extracted entities, and source references.")

        return {
            "summary": " ".join(summary_parts),
            "category": majority_category,
            "claims": workspace.get("claims", []),
            "timeline": timeline,
            "conflicts": conflicts,
            "locations": locations,
            "source_refs": workspace.get("source_refs", []),
            "uncertainty_statements": workspace.get("uncertainty_statements", []),
            "summary_source": SummarySource.STRUCTURED_FALLBACK,
        }

    def answer_from_events(self, question: str, events: list[Any]) -> str:
        """Generate a concise assistant fallback answer from retrieved event evidence."""

        if not events:
            return "No sufficiently relevant event/article evidence was retrieved."

        event = events[0]
        parts = [event.summary or "The retrieved event has stored evidence but no narrative summary yet."]
        if event.conflicts:
            statements = [
                c.get("uncertainty_statement")
                for c in event.conflicts
                if c.get("uncertainty_statement")
            ]
            if statements:
                parts.append(statements[0])
        if event.timeline:
            parts.append(f"Timeline entries available: {len(event.timeline)}.")
        return " ".join(parts)

    def _extract_numeric_claims(self, article: Any, claims: list[dict[str, Any]]) -> list[str]:
        text = f"{article.title}. {article.cleaned_text or ''}"
        claim_ids: list[str] = []
        for match in self._number_claim_pattern.finditer(text):
            claim_id = f"{article.id}:claim:{len(claims) + 1}"
            claim = {
                "claim_id": claim_id,
                "article_id": article.id,
                "aspect": match.group("aspect").lower(),
                "value": int(match.group("value")),
                "time": article.published_at.isoformat() if article.published_at else None,
                "location": None,
                "status": "extracted",
                "supporting_text_ref": "numeric-pattern",
            }
            claims.append(claim)
            claim_ids.append(claim_id)
        return claim_ids

    def _detect_conflicts(
        self, claims: list[dict[str, Any]], source_refs: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        source_by_article = {ref["article_id"]: ref for ref in source_refs}
        values_by_aspect: dict[str, set[int]] = defaultdict(set)
        claims_by_aspect: dict[str, list[dict[str, Any]]] = defaultdict(list)

        for claim in claims:
            aspect = str(claim.get("aspect") or "")
            value = claim.get("value")
            if aspect and isinstance(value, int):
                values_by_aspect[aspect].add(value)
                claims_by_aspect[aspect].append(claim)

        conflicts: list[dict[str, Any]] = []
        for aspect, values in values_by_aspect.items():
            if len(values) <= 1:
                continue
            sorted_values = sorted(values)
            participating_claims = claims_by_aspect[aspect]
            sources = sorted(
                {
                    (source_by_article.get(claim["article_id"]) or {}).get("source_name", "Unknown Source")
                    for claim in participating_claims
                }
            )
            conflicts.append(
                {
                    "conflict_id": f"conflict:{aspect}:{'-'.join(map(str, sorted_values))}",
                    "aspect": aspect,
                    "values_reported": sorted_values,
                    "claim_ids": [claim["claim_id"] for claim in participating_claims],
                    "sources": sources,
                    "resolution_status": "UNRESOLVED",
                    "uncertainty_statement": (
                        f"Reports vary between {sorted_values[0]} and {sorted_values[-1]} "
                        f"{aspect}; the figure has not been resolved by the collected evidence."
                    ),
                }
            )
        return conflicts
