import re
from typing import Optional, Tuple
from urllib.parse import urlparse

# Ordered (pattern, source key, display name). Extensible: add a new social
# source by appending one entry here — nothing else needs to change to
# detect it (routes/frontend key off the (source, source_display) pair).
_SOURCE_PATTERNS = [
    (re.compile(r"(^|\.)linkedin\.com$"), "linkedin", "LinkedIn"),
    (re.compile(r"(^|\.)(x\.com|twitter\.com)$"), "x", "X"),
    (re.compile(r"(^|\.)instagram\.com$"), "instagram", "Instagram"),
    (re.compile(r"(^|\.)(reddit\.com|redd\.it)$"), "reddit", "Reddit"),
]

SOURCE_DISPLAY = {
    "linkedin": "LinkedIn",
    "x": "X",
    "instagram": "Instagram",
    "reddit": "Reddit",
    "other": "Other",
}


def detect_source(url: Optional[str]) -> Tuple[str, str]:
    """Identifies the source from a URL's host only — never guesses from
    free text. Returns ("other", "Other") for anything not confidently
    matched, per spec: 'If the source cannot be confidently identified,
    do not guess.'"""
    if not url:
        return "other", "Other"
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return "other", "Other"
    if host.startswith("www."):
        host = host[4:]
    for pattern, key, display in _SOURCE_PATTERNS:
        if pattern.search(host):
            return key, display
    return "other", "Other"


def source_display_for(source: str) -> str:
    return SOURCE_DISPLAY.get(source, "Other")
