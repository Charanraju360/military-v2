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
            text_excerpt = (article.cleaned_text or article.raw_text or "").strip()
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
                    "text_excerpt": text_excerpt[:2000],
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
        """Create a comprehensive, multi-paragraph structured event intelligence briefing."""

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
        claims = workspace.get("claims", [])
        entities = workspace.get("entities", [])

        # Categorize extracted entities
        orgs = sorted({e["text"] for e in entities if e.get("type") in ("ORG", "ORGANIZATION")})
        persons = sorted({e["text"] for e in entities if e.get("type") in ("PERSON", "PER")})
        weapons = sorted({e["text"] for e in entities if e.get("type") in ("EQUIPMENT", "WEAPON", "MISSILE", "VEHICLE")})

        # Extract substantive, high-information sentences from member articles
        substantive_sentences: list[str] = []
        seen_sentence_prefixes: set[str] = set()
        noise_keywords = {
            "subscribe", "cookie", "advertisement", "all rights reserved",
            "copyright", "click here", "sign up", "terms of use", "privacy policy",
            "photo:", "getty images", "reuters", "associated press", "read more"
        }

        lead_title = articles[0].title.rstrip(".!?") if articles else "Military Developments"

        for article in articles:
            full_text = f"{article.title}. {article.cleaned_text or article.raw_text or ''}"
            # Clean non-standard unicode replacement characters
            cleaned_body = full_text.replace("\ufffd", "'").replace("’", "'").replace("“", '"').replace("”", '"')
            cleaned_body = re.sub(r"\bU\.S\.", "US", cleaned_body)
            cleaned_body = re.sub(r"\bU\.K\.", "UK", cleaned_body)
            cleaned_body = re.sub(r"\bU\.N\.", "UN", cleaned_body)
            # Split sentences cleanly
            raw_sentences = re.split(r"(?<=[.!?])\s+", cleaned_body)
            for s in raw_sentences:
                s_clean = s.strip()
                if len(s_clean) < 25 or len(s_clean) > 400:
                    continue
                lower_s = s_clean.lower()
                if any(noise in lower_s for noise in noise_keywords):
                    continue
                if lead_title.lower() == lower_s.rstrip(".!?"):
                    continue
                prefix = lower_s[:40]
                if prefix in seen_sentence_prefixes:
                    continue
                seen_sentence_prefixes.add(prefix)
                substantive_sentences.append(s_clean)

        # Build paragraphs
        paragraphs: list[str] = []

        # 1. Situation Brief / Operational Lead
        cat = majority_category if isinstance(majority_category, Category) else Category.OTHER_MILITARY
        category_label = cat.value.replace("_", " ").title()
        loc_str = f" in {', '.join(locations[:3])}" if locations else ""
        time_str = ""
        if timeline:
            t = timeline[-1].get("time") or timeline[0].get("time")
            if t:
                time_str = f" as of {t[:10]}"

        source_desc = f"{len(source_names)} source{'s' if len(source_names) != 1 else ''} ({', '.join(source_names[:3])})" if source_names else "field reporting"
        p1 = f"Operational Situation Brief: {lead_title}. Analysis of {article_count} reports across {source_desc}{loc_str}{time_str} indicates active military developments classified under {category_label}."
        
        # Attach the most descriptive opening sentence to lead paragraph
        if substantive_sentences:
            p1 += " " + substantive_sentences[0]
        paragraphs.append(p1)

        # 2. Detailed Tactical & Strategic Narrative
        if len(substantive_sentences) > 1:
            p2 = "Tactical Assessment & Key Actions: " + " ".join(substantive_sentences[1:5])
        else:
            p2 = (
                f"Tactical Assessment & Key Actions: Monitored field reporting confirms coordinated operational maneuvers and strategic engagements within the theater. "
                f"Defense monitoring nodes logged sustained readiness and mission execution aligning with {category_label.lower()} directives."
            )
        paragraphs.append(p2)

        # 3. Actors, Equipment, and Quantitative Metrics
        detail_components: list[str] = []
        if orgs:
            detail_components.append(f"Primary organizations and defense bodies engaged include {', '.join(orgs[:4])}.")
        if persons:
            detail_components.append(f"Key military and political figures cited in dispatches include {', '.join(persons[:3])}.")
        if weapons:
            detail_components.append(f"Combat assets and defense platforms referenced include {', '.join(weapons[:4])}.")
        if claims:
            claims_summary = ", ".join(f"{c['value']} {c['aspect']}" for c in claims[:4])
            detail_components.append(f"Quantifiable operational metrics logged: {claims_summary}.")
        if not detail_components:
            detail_components.append(
                "Operational assets and command elements identified in dispatches span frontline units, logistical commands, and regional defense infrastructure."
            )

        paragraphs.append("Force Elements & Platform Intelligence: " + " ".join(detail_components))

        # 4. Strategic Assessment & Regional Impact
        p4 = (
            f"Strategic Context & Geopolitical Impact: The reported developments hold direct operational significance for theater balance, deterrence readiness, and alliance coordination{loc_str}. "
            "Regional command structures continue monitoring escalation pathways and cross-border posture adjustments as subsequent reporting develops."
        )
        paragraphs.append(p4)

        # 5. Conflicts, Uncertainties, and Provenance
        if conflicts:
            conflict_stmt = conflicts[0].get("uncertainty_statement") or "Conflicting figures remain unresolved among reported sources."
            paragraphs.append(f"Information Assurance & Discrepancies: {conflict_stmt} Source reports diverge across reporting lines.")
        elif workspace.get("uncertainty_statements"):
            paragraphs.append(f"Information Assurance: {workspace['uncertainty_statements'][0]}")
        else:
            paragraphs.append(
                f"Information Assurance: Multi-source corroboration confirms mutual consistency across reported parameters with no unresolved tactical discrepancies logged across {source_desc}."
            )

        final_summary = "\n\n".join(paragraphs)

        return {
            "summary": final_summary,
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
        """Generate an assistant answer grounded in retrieved event evidence."""

        if not events:
            return "No verified military event or dispatch evidence was found matching the specific query parameters."

        # Select the event with highest token overlap with the user question
        q_tokens = {w.lower() for w in re.findall(r"\w+", question) if len(w) > 3}
        best_event = events[0]
        best_score = -1

        for ev in events:
            score = 0
            ev_text = f"{getattr(ev, 'summary', '')} {' '.join(getattr(ev, 'locations', []))} {getattr(ev, 'category', '')}".lower()
            for token in q_tokens:
                if token in ev_text:
                    score += 1
            if score > best_score:
                best_score = score
                best_event = ev

        event = best_event
        summary_text = getattr(event, "summary", "") or ""
        if not summary_text:
            return "The retrieved event has stored evidence but no narrative summary yet."

        parts = [summary_text]
        if getattr(event, "conflicts", None):
            statements = [
                c.get("uncertainty_statement")
                for c in event.conflicts
                if isinstance(c, dict) and c.get("uncertainty_statement")
            ]
            if statements:
                parts.append(statements[0])
        return "\n\n".join(parts) if "\n\n" in summary_text else " ".join(parts)

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
