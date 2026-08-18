from fastapi import APIRouter, Depends
from models import OpportunityDiscoverRequest, OpportunityApplyRequest
from agents import OpportunityAgent, MemoryAgent, DocumentationAgent
from typing import Dict, List

router = APIRouter()

def get_agents() -> Dict:
    return {
        "opportunity": OpportunityAgent(),
        "memory": MemoryAgent(),
        "documentation": DocumentationAgent(),
    }

@router.post("/discover")
async def discover_opportunities(
    request: OpportunityDiscoverRequest,
    agents: Dict = Depends(get_agents),
):
    """Discover and rank job opportunities"""
    try:
        opportunity_agent = agents["opportunity"]
        memory_agent = agents["memory"]

        jobs = opportunity_agent.discover_jobs(request.role, request.location)
        user_context = memory_agent.get_user_context()
        ranked_jobs = opportunity_agent.rank_opportunities(jobs, user_context)

        return {
            "opportunities": ranked_jobs,
            "total_found": len(ranked_jobs),
        }
    except Exception as e:
        return {"error": str(e), "opportunities": [], "total_found": 0}

@router.post("/apply")
async def apply_to_opportunity(
    request: OpportunityApplyRequest,
    agents: Dict = Depends(get_agents),
):
    """Generate email draft for applying to opportunity"""
    try:
        opportunity_agent = agents["opportunity"]
        memory_agent = agents["memory"]
        documentation_agent = agents["documentation"]

        user_context = memory_agent.get_user_context()

        jobs = opportunity_agent.discover_jobs("Any", "Any")
        opportunity = next((j for j in jobs if j["id"] == request.opportunity_id), jobs[0])

        email_draft = documentation_agent.generate_email(opportunity, user_context)

        return {
            "opportunity_id": request.opportunity_id,
            "email_draft": email_draft,
            "waiting_approval": True,
        }
    except Exception as e:
        return {
            "error": str(e),
            "email_draft": "",
            "waiting_approval": False,
        }
