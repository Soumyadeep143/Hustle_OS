from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException

from models import (
    ApproveActionResponse,
    Prospect,
    ProspectCreateRequest,
    ProspectSummary,
    RecallActivityEvent,
    RecallDashboardResponse,
    RecallQueryRequest,
    RecallQueryResponse,
)
from agents import ExecutionAgent, RecallStore, ResearchAgent, StrategyAgent
from memory_providers import get_memory_provider

router = APIRouter()


def get_recall_deps() -> Dict:
    return {
        "store": RecallStore(),
        "memory": get_memory_provider(),
        "research": ResearchAgent(),
        "strategy": StrategyAgent(),
        "execution": ExecutionAgent(),
    }


def _find_prospect_match(prospects: List[Dict], question: str) -> Dict:
    """Matches on any name token (first/last name), not just the full name,
    so "Why is Rahul high priority?" matches "Rahul Sharma"."""
    q = question.lower()
    best = None
    best_len = 0
    for p in prospects:
        candidates = [p["name"].lower()] + p["name"].lower().split()
        for token in candidates:
            if len(token) > 2 and token in q and len(token) > best_len:
                best = p
                best_len = len(token)
    return best


_PLANNING_PHRASES = [
    "what should i do",
    "what to do next",
    "who should i follow up",
    "who should i talk to",
    "what's my next",
    "what is my next",
    "top priority",
    "highest priority",
    "next best action",
]


def _is_planning_query(question: str) -> bool:
    q = question.lower()
    return any(phrase in q for phrase in _PLANNING_PHRASES)


def _memory_summary(entries: List[Dict]) -> str:
    return "; ".join(e["text"] for e in entries[-5:]) if entries else "No stored memory yet."


def _truncate(text: str, limit: int) -> str:
    """Cuts at the last word boundary before `limit` instead of mid-word,
    so stored/displayed action results don't end on a fragment like
    "...engaged with o"."""
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return cut + "…"


def _fallback_grounded_answer(match: Dict, facts: List[Dict], nba: Dict) -> str:
    """Used when the Claude call is unavailable. Composes a multi-sentence,
    still fully grounded answer (score + up to 2 cited facts + recommended
    action) instead of one flat concatenated line, matching the "Why is
    Rahul high priority?" narrative shape without inventing anything."""
    sentences = [
        f"{match['name']} currently has a lead score of {match['lead_score']} ({match['intent']} intent)."
    ]

    # Prefer research-derived facts over our own action-log entries for
    # citations — a logged "Executed action: ..." memory is real but not
    # informative as a reason, so it shouldn't crowd out the actual facts.
    research_facts = [f for f in facts if f.get("metadata", {}).get("type") != "action"]
    cited = (research_facts or facts)[:2]
    if cited:
        cited_text = " and ".join(f'"{f["text"]}"' for f in cited)
        sentences.append(f"This is grounded in stored memory: {cited_text}.")
    else:
        sentences.append("No stored memory yet — this reflects the initial score only.")

    if nba:
        sentences.append(f"The recommended next action is: {nba['action']} (reason: {nba['reason']}).")

    return " ".join(sentences)


def _facts_for_prospect(memory, prospect_id: str) -> List[Dict]:
    entries = memory.get(prospect_id)
    return [
        {
            "id": e["id"],
            "type": e.get("metadata", {}).get("type", "fact"),
            "text": e["text"],
            "source_url": e.get("metadata", {}).get("source_url"),
            "confidence": None,
            "created_at": e["created_at"],
        }
        for e in entries
    ]


def _answer_planning_query(prospects: List[Dict]) -> RecallQueryResponse:
    """Answers "what should I do next?" style questions by reusing the
    next-best-actions StrategyAgent already computed and stored — no
    separate recommendation engine, per spec."""
    pending = [p for p in prospects if p.get("next_best_action")]
    if not pending:
        return RecallQueryResponse(
            answer="No pending recommendations right now — every prospect is either new or already actioned.",
            grounded=True,
        )

    top = pending[0]  # store.list_prospects() is already sorted by lead_score desc
    nba = top["next_best_action"]
    answer = (
        f"You have {len(pending)} pending GTM action(s). Top priority: {top['name']} at {top['company']} "
        f"(lead score {top['lead_score']}, {top['intent']} intent). "
        f"Recommended action: {nba['action']}. Why: {nba['reason']}"
    )
    return RecallQueryResponse(answer=answer, prospect_id=top["id"], grounded=True)


_AGENT_FOR_LABEL = {
    "Prospect added": "Capture",
    "Research completed": "Research Agent",
    "Memory created": "Memory",
    "Next best action generated": "Strategy Agent",
    "User approved": "User",
    "Action executed": "Execution Agent",
}


def _agent_for_label(label: str) -> str:
    return _AGENT_FOR_LABEL.get(label, "RECALL")


def _rescore(prospect_id: str, deps: Dict) -> Dict:
    store = deps["store"]
    memory = deps["memory"]
    strategy = deps["strategy"]

    prospect = store.get_prospect(prospect_id)
    facts = memory.get(prospect_id)

    scoring = strategy.score(prospect, facts)
    store.update_scores(prospect_id, scoring["lead_score"], scoring["intent"], scoring["relationship"])

    prospect = store.get_prospect(prospect_id)
    nba = strategy.next_best_action(prospect, facts)
    store.set_next_best_action(prospect_id, nba["action"], nba["reason"])
    store.add_timeline_event(prospect_id, "Next best action generated", nba["action"])

    return store.get_prospect(prospect_id)


@router.post("/prospects", response_model=Prospect)
async def create_prospect(request: ProspectCreateRequest, deps: Dict = Depends(get_recall_deps)):
    """Create a prospect, run the Research Agent, store findings in memory,
    then score and generate a next-best-action — the full capture-to-recommendation loop."""
    store = deps["store"]
    memory = deps["memory"]
    research = deps["research"]

    prospect = store.create_prospect(
        name=request.name,
        company=request.company,
        role=request.role,
        email=request.email,
        source_url=request.source_url,
        notes=request.notes,
    )

    findings = research.research(request.name, request.company, request.role, request.notes)["findings"]
    for f in findings:
        memory.add(
            prospect["id"],
            f.get("text", ""),
            {"type": f.get("type", "fact"), "source_url": request.source_url},
        )
    store.add_timeline_event(prospect["id"], "Research completed", f"{len(findings)} findings")
    store.add_timeline_event(prospect["id"], "Memory created", f"{len(findings)} memories stored")

    updated = _rescore(prospect["id"], deps)
    return Prospect(**updated, memory=_facts_for_prospect(memory, prospect["id"]))


@router.get("/prospects", response_model=List[ProspectSummary])
async def list_prospects(deps: Dict = Depends(get_recall_deps)):
    store = deps["store"]
    prospects = store.list_prospects()
    return [
        ProspectSummary(
            id=p["id"],
            name=p["name"],
            company=p["company"],
            role=p.get("role"),
            relationship=p["relationship"],
            lead_score=p["lead_score"],
            intent=p["intent"],
            next_best_action=(p["next_best_action"]["action"] if p.get("next_best_action") else None),
        )
        for p in prospects
    ]


@router.get("/prospects/{prospect_id}", response_model=Prospect)
async def get_prospect(prospect_id: str, deps: Dict = Depends(get_recall_deps)):
    store = deps["store"]
    memory = deps["memory"]

    prospect = store.get_prospect(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    return Prospect(**prospect, memory=_facts_for_prospect(memory, prospect_id))


@router.post("/prospects/{prospect_id}/approve", response_model=ApproveActionResponse)
async def approve_action(prospect_id: str, deps: Dict = Depends(get_recall_deps)):
    """Approve → Execute → Result → Memory Update → Re-evaluate."""
    store = deps["store"]
    memory = deps["memory"]
    execution = deps["execution"]

    prospect = store.get_prospect(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    if not prospect.get("next_best_action"):
        raise HTTPException(status_code=400, detail="No recommendation to approve yet")

    action = prospect["next_best_action"]["action"]
    reason = prospect["next_best_action"]["reason"]
    facts = memory.get(prospect_id)

    store.add_timeline_event(prospect_id, "User approved", action)

    result = execution.execute(action, reason, prospect, _memory_summary(facts))

    memory.add(
        prospect_id,
        f"Executed action: {action}. Result: {_truncate(result.get('output', ''), 300)}",
        {"type": "action"},
    )
    store.add_timeline_event(prospect_id, "Action executed", _truncate(result.get("output", ""), 120))
    store.clear_next_best_action(prospect_id)

    updated = _rescore(prospect_id, deps)
    full_prospect = Prospect(**updated, memory=_facts_for_prospect(memory, prospect_id))

    return ApproveActionResponse(
        prospect=full_prospect,
        result=result.get("output", ""),
        executed_by=result.get("provider", "local"),
    )


@router.get("/dashboard", response_model=RecallDashboardResponse)
async def recall_dashboard(deps: Dict = Depends(get_recall_deps)):
    store = deps["store"]
    prospects = store.list_prospects()

    high_intent = [p for p in prospects if p["intent"] == "high"]
    with_actions = [p for p in prospects if p.get("next_best_action")]

    insights = []
    if high_intent:
        insights.append(f"{len(high_intent)} prospect(s) are currently high intent")
    if with_actions:
        insights.append(f"{len(with_actions)} prospect(s) have a pending recommended action")
    if not prospects:
        insights.append("No prospects yet — add one to get started")

    return RecallDashboardResponse(
        total_prospects=len(prospects),
        high_intent=len(high_intent),
        followups_today=len(with_actions),
        next_best_actions=[
            {"prospect_id": p["id"], "name": p["name"], "action": p["next_best_action"]["action"]}
            for p in with_actions[:5]
        ],
        insights=insights or ["Stay on top of your pipeline"],
    )


@router.get("/activity", response_model=List[RecallActivityEvent])
async def recall_activity(limit: int = 20, deps: Dict = Depends(get_recall_deps)):
    """Real agent activity, not simulated: flattens each prospect's actual
    timeline (already written by create_prospect/_rescore/approve_action)
    into one reverse-chronological feed across the whole pipeline."""
    store = deps["store"]
    prospects = store.list_prospects()

    events = [
        RecallActivityEvent(
            id=event["id"],
            agent=_agent_for_label(event["label"]),
            label=event["label"],
            detail=event.get("detail"),
            prospect_id=p["id"],
            prospect_name=p["name"],
            created_at=event["created_at"],
        )
        for p in prospects
        for event in p["timeline"]
    ]
    events.sort(key=lambda e: e.created_at, reverse=True)
    return events[:limit]


@router.post("/query", response_model=RecallQueryResponse)
async def recall_query(request: RecallQueryRequest, deps: Dict = Depends(get_recall_deps)):
    """Grounded natural-language Q&A over structured state + memory. Never
    answers about a prospect it can't find in stored state."""
    store = deps["store"]
    memory = deps["memory"]

    prospects = store.list_prospects()
    match = _find_prospect_match(prospects, request.question)

    if not match and _is_planning_query(request.question):
        return _answer_planning_query(prospects)

    if not match:
        return RecallQueryResponse(
            answer="I couldn't find a prospect matching that name in RECALL yet.",
            grounded=False,
        )

    facts = memory.get(match["id"])
    facts_text = "\n".join(f"- {f['text']}" for f in facts) or "No stored memory yet."
    nba = match.get("next_best_action")

    try:
        import os

        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        prompt = f"""Answer the user's question about this prospect using ONLY
the grounded context below. Do not add information that isn't present.

Question: {request.question}

Prospect: {match['name']}, {match.get('role') or 'unknown role'} at {match['company']}
Lead score: {match['lead_score']}
Intent: {match['intent']}
Next best action: {nba['action'] if nba else 'none yet'} (reason: {nba['reason'] if nba else 'n/a'})

Stored memory:
{facts_text}

Answer in 2-3 sentences."""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=250,
            messages=[{"role": "user", "content": prompt}],
        )
        answer = response.choices[0].message.content
    except Exception as e:
        print(f"Error in recall query: {e}")
        answer = _fallback_grounded_answer(match, facts, nba)

    return RecallQueryResponse(answer=answer, prospect_id=match["id"], grounded=True)
