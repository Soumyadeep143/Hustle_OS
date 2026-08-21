from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from agents import OutreachAgent, MemoryAgent
from typing import Dict, List, Optional

router = APIRouter()


class DreamCompanyRequest(BaseModel):
    role: str
    location: str


class HiringManagerRequest(BaseModel):
    company: str
    role: str


class OutreachSequenceRequest(BaseModel):
    company: str
    role: str
    user_id: str = "user_default"


class DreamCompanyResponse(BaseModel):
    name: str
    size: str
    stage: str
    hiring: bool
    salary_range: Optional[str] = None
    fit_signals: List[str] = []
    reach_score: int = 0


class HiringManager(BaseModel):
    name: str
    title: str
    focus: str


class OutreachEmail(BaseModel):
    day: int
    type: str
    subject: str
    body: str


def get_agents() -> Dict:
    return {
        "outreach": OutreachAgent(),
        "memory": MemoryAgent(),
    }


@router.post("/dream-companies")
async def find_dream_companies(
    request: DreamCompanyRequest,
    agents: Dict = Depends(get_agents),
):
    """Find top companies for the given role and location"""
    try:
        outreach_agent = agents["outreach"]
        memory_agent = agents["memory"]

        companies = outreach_agent.find_dream_companies(request.role, request.location)
        user_context = memory_agent.get_user_context()

        results = []
        for company in companies:
            signals = outreach_agent.find_job_fit_signals(company, user_context)
            reach_score = outreach_agent.calculate_reach_score(company, user_context)

            results.append(
                DreamCompanyResponse(
                    name=company["name"],
                    size=company.get("size", "Unknown"),
                    stage=company.get("stage", "Unknown"),
                    hiring=company.get("hiring", False),
                    salary_range=company.get("salary_range"),
                    fit_signals=signals,
                    reach_score=reach_score,
                )
            )

        return {"companies": results, "total": len(results)}
    except Exception as e:
        return {"error": str(e), "companies": [], "total": 0}


@router.post("/hiring-managers")
async def find_hiring_managers(
    request: HiringManagerRequest,
    agents: Dict = Depends(get_agents),
):
    """Find hiring managers for a company"""
    try:
        outreach_agent = agents["outreach"]
        managers = outreach_agent.find_hiring_managers(request.company, request.role)

        return {
            "company": request.company,
            "role": request.role,
            "hiring_managers": managers,
            "total": len(managers),
        }
    except Exception as e:
        return {"error": str(e), "hiring_managers": [], "total": 0}


@router.post("/sequence")
async def generate_outreach_sequence(
    request: OutreachSequenceRequest,
    agents: Dict = Depends(get_agents),
):
    """Generate personalized outreach email sequence"""
    try:
        outreach_agent = agents["outreach"]
        memory_agent = agents["memory"]

        user_context = memory_agent.get_user_context()
        sequence = outreach_agent.generate_outreach_sequence(
            request.company,
            request.role,
            user_context,
        )

        return {
            "company": request.company,
            "role": request.role,
            "sequence": sequence,
            "total_emails": len(sequence),
        }
    except Exception as e:
        return {"error": str(e), "sequence": [], "total_emails": 0}


@router.get("/campaign-plan")
async def get_campaign_plan(
    company: str = Query(...),
    role: str = Query(...),
    agents: Dict = Depends(get_agents),
):
    """Get complete campaign plan for a company"""
    try:
        outreach_agent = agents["outreach"]
        memory_agent = agents["memory"]

        user_context = memory_agent.get_user_context()

        company_data = {
            "name": company,
            "role": role,
        }

        managers = outreach_agent.find_hiring_managers(company, role)
        sequence = outreach_agent.generate_outreach_sequence(company, role, user_context)
        signals = outreach_agent.find_job_fit_signals(company_data, user_context)
        reach_score = outreach_agent.calculate_reach_score(company_data, user_context)

        return {
            "company": company,
            "role": role,
            "fit_signals": signals,
            "reach_score": reach_score,
            "hiring_managers": managers,
            "email_sequence": sequence,
            "campaign_duration_days": 14,
            "total_touchpoints": len(sequence),
        }
    except Exception as e:
        return {"error": str(e)}
