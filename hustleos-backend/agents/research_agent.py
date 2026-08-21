import json
import os
import re
from typing import Dict, Optional
from urllib.parse import urlparse

from openai import OpenAI

CATEGORIES = [
    "Career", "Job", "Internship", "Company", "Person", "Hackathon", "Event",
    "AI / Technology", "Research", "Knowledge", "Business Opportunity",
    "Startup", "Learning", "Other",
]


class ResearchAgent:
    """Enriches a user-captured RECALL item (a URL + the user's own words
    about it) into structured fields: title, category, summary, extracted
    details. There is no scraping/browsing tool in this backend — it never
    opens the link — so enrichment works only from the URL itself (host and
    slug) and the user's description, and never invents a company, person,
    location, or date that isn't stated or clearly implied by that input."""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"

    def enrich(self, source_display: str, url: Optional[str], description: str) -> Dict:
        slug_title = _slug_title(url)
        description = (description or "").strip()

        try:
            if not description and not slug_title:
                raise ValueError("nothing to enrich from")

            prompt = f"""You are HustleOS's capture assistant. A user just saved a link
while browsing {source_display}. You cannot open the link — work ONLY from the
URL itself and the user's own words below. Never invent a company, person,
location, date, or fact that isn't stated or clearly implied by this input.

URL: {url or 'none provided'}
URL slug hint: {slug_title or 'none'}
User's description: {description or 'none provided'}

Return ONLY a JSON object with these keys:
- title: short, specific title for this item
- category: the single best fit from {CATEGORIES}
- subcategory: short label, or null
- ai_summary: 1-2 sentences, grounded only in the input above
- company: or null
- person: or null
- location: or null
- event_date: or null — only if a date is actually stated
- opportunity: one short sentence on why this might matter to the user, or null if unclear
- confidence: "High" if the description is specific, "Medium" if partial, "Low" if there's almost nothing to go on
- tags: a JSON array of 2-5 short, lowercase, single-or-two-word tags for organizing this capture (e.g. ["ai-engineer", "remote", "series-b"]) grounded only in the input above -- never invent a tag for a fact not present in the input"""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            data["extraction_note"] = None
            confidence = str(data.get("confidence") or "Medium").strip().capitalize()
            data["confidence"] = confidence if confidence in ("High", "Medium", "Low") else "Medium"
            tags = data.get("tags")
            data["tags"] = [str(t).strip() for t in tags if str(t).strip()] if isinstance(tags, list) else []
            return data
        except Exception as e:
            print(f"Error in research agent enrich: {e}")
            return self._fallback_enrichment(source_display, description, slug_title)

    def refine_dictation(self, raw_text: str) -> str:
        """Cleans up a voice-dictated capture note: strips filler words and
        fixes grammar/punctuation. Never adds information or changes meaning
        — falls back to the raw transcript untouched if the LLM call fails."""
        raw_text = (raw_text or "").strip()
        if not raw_text:
            return ""
        try:
            prompt = f"""Clean up this voice-dictated note: remove filler words
("um", "like", "you know"), fix grammar and punctuation, keep it concise. Do
NOT add any information that isn't already there, and do NOT change the
meaning. Return ONLY the cleaned text, nothing else — no quotes, no preamble.

Dictated note: {raw_text}"""
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            cleaned = (response.choices[0].message.content or "").strip()
            return cleaned or raw_text
        except Exception as e:
            print(f"Error refining dictation: {e}")
            return raw_text

    @staticmethod
    def _fallback_enrichment(source_display: str, description: str, slug_title: str) -> Dict:
        """Used when the LLM call is unavailable or there's nothing to work
        with. Never fabricates specifics — if there's no description and no
        derivable URL slug, says so explicitly instead of inventing detail."""
        title = slug_title or (description[:60] if description else f"{source_display} capture")
        note = None if (description or slug_title) else "Link captured. Additional information unavailable."
        return {
            "title": title,
            "category": "Other",
            "subcategory": None,
            "ai_summary": description or None,
            "company": None,
            "person": None,
            "location": None,
            "event_date": None,
            "opportunity": None,
            "confidence": "Medium" if description else "Low",
            "extraction_note": note,
            "tags": [],
        }


def _slug_title(url: Optional[str]) -> str:
    if not url:
        return ""
    try:
        path = urlparse(url).path
    except ValueError:
        return ""
    segments = [s for s in path.split("/") if s]
    slug = segments[-1] if segments else ""
    slug = re.sub(r"[-_]+", " ", slug)
    slug = re.sub(r"\.\w+$", "", slug).strip()
    if not slug:
        return ""
    return re.sub(r"\b\w", lambda m: m.group().upper(), slug)
