from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from agents import LinkedInAgent, MemoryAgent
from auth import get_current_user_id
from typing import Dict, List

router = APIRouter()


class LinkedInDMRequest(BaseModel):
    recruiter_name: str
    recruiter_title: str
    recruiter_focus: str
    role: str


class LinkedInPostRequest(BaseModel):
    topic: str


def get_agents(user_id: str = Depends(get_current_user_id)) -> Dict:
    return {
        "linkedin": LinkedInAgent(),
        "memory": MemoryAgent(user_id=user_id),
    }


@router.post("/recruiters")
async def find_recruiters(
    company: str = Query(...),
    location: str = Query("Bengaluru"),
    agents: Dict = Depends(get_agents),
):
    """Find recruiters at a specific company"""
    try:
        linkedin_agent = agents["linkedin"]
        memory_agent = agents["memory"]

        recruiters = linkedin_agent.find_recruiters(company, location)
        user_context = memory_agent.get_user_context()

        results = []
        for recruiter in recruiters:
            analysis = linkedin_agent.analyze_recruiter_profile(recruiter, user_context)
            results.append({**recruiter, **analysis})

        results.sort(key=lambda x: x["fit_score"], reverse=True)

        return {
            "company": company,
            "location": location,
            "recruiters": results,
            "total": len(results),
        }
    except Exception as e:
        return {"error": str(e), "recruiters": [], "total": 0}


@router.post("/dm")
async def generate_dm(
    request: LinkedInDMRequest,
    agents: Dict = Depends(get_agents),
):
    """Generate personalized LinkedIn DM to recruiter"""
    try:
        linkedin_agent = agents["linkedin"]
        memory_agent = agents["memory"]

        recruiter = {
            "name": request.recruiter_name,
            "title": request.recruiter_title,
            "focus": request.recruiter_focus,
        }

        user_context = memory_agent.get_user_context()
        dm_text = linkedin_agent.generate_linkedin_dm(recruiter, user_context, request.role)

        return {
            "recruiter": request.recruiter_name,
            "dm": dm_text,
            "tips": [
                "Personalize this message before sending",
                "Follow the recruiter first",
                "Keep it under 250 characters",
                "Include a clear call to action",
            ],
        }
    except Exception as e:
        return {"error": str(e), "dm": ""}


@router.get("/engagement-tips")
async def get_engagement_tips(
    company: str = Query(...),
    agents: Dict = Depends(get_agents),
):
    """Get tips for engaging with a company on LinkedIn"""
    try:
        linkedin_agent = agents["linkedin"]
        tips = linkedin_agent.get_linkedin_engagement_tips(company)

        return {
            "company": company,
            "tips": tips,
            "total": len(tips),
        }
    except Exception as e:
        return {"error": str(e), "tips": []}


@router.get("/profile-tips")
async def get_profile_tips(
    agents: Dict = Depends(get_agents),
):
    """Get suggestions to improve LinkedIn profile"""
    try:
        linkedin_agent = agents["linkedin"]
        memory_agent = agents["memory"]

        user_context = memory_agent.get_user_context()
        tips = linkedin_agent.build_linkedin_profile_tips(user_context)

        return {
            "tips": tips,
            "total": len(tips),
        }
    except Exception as e:
        return {"error": str(e), "tips": []}


@router.post("/generate-post")
async def generate_linkedin_post(
    request: LinkedInPostRequest,
    agents: Dict = Depends(get_agents),
):
    """Generate LinkedIn post to increase visibility"""
    try:
        linkedin_agent = agents["linkedin"]
        memory_agent = agents["memory"]

        user_context = memory_agent.get_user_context()
        post = linkedin_agent.generate_linkedin_post(request.topic, user_context)

        return {
            "topic": request.topic,
            "post": post,
            "tips": [
                "Post during peak hours (9-11 AM, Tuesday-Thursday)",
                "Include 3-5 relevant hashtags",
                "Use line breaks for readability",
                "Encourage comments with a question",
                "Re-share after 3-5 days for reach",
            ],
        }
    except Exception as e:
        return {"error": str(e), "post": ""}


@router.get("/dream-network")
async def get_dream_network(
    role: str = Query(...),
    company: str = Query(...),
    agents: Dict = Depends(get_agents),
):
    """Get complete networking strategy for dream company"""
    try:
        linkedin_agent = agents["linkedin"]
        memory_agent = agents["memory"]

        user_context = memory_agent.get_user_context()
        recruiters = linkedin_agent.find_recruiters(company, user_context["profile"]["target_location"])

        strategy = {
            "company": company,
            "role": role,
            "phase_1_connect": {
                "days": "1-2",
                "action": "Follow company page and engage with recent posts",
                "tactics": [
                    "Like last 5 company posts",
                    "Comment thoughtfully on recent announcements",
                    "Share company content to your network",
                ],
            },
            "phase_2_reach": {
                "days": "3-5",
                "action": "Send personalized DMs to recruiters",
                "recruiters": [
                    {
                        **recruiter,
                        "dm": linkedin_agent.generate_linkedin_dm(
                            recruiter, user_context, role
                        ),
                    }
                    for recruiter in recruiters[:3]
                ],
            },
            "phase_3_nurture": {
                "days": "6-14",
                "action": "Regular engagement and follow-ups",
                "tactics": [
                    "Engage with team members' posts",
                    "Share relevant content to feed",
                    "Post about industry topics",
                    "Follow up with recruiters after 1 week",
                ],
            },
            "phase_4_apply": {
                "days": "7+",
                "action": "Submit formal application when opened",
                "tactics": [
                    "Customize cover letter",
                    "Mention previous interactions",
                    "Reference recruiter by name",
                    "Follow up after application",
                ],
            },
        }

        return strategy
    except Exception as e:
        return {"error": str(e)}
