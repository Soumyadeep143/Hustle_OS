from fastapi import APIRouter, Depends, Query
from agents import AssessmentAgent, MemoryAgent
from typing import Dict

router = APIRouter()


def get_agents() -> Dict:
    return {
        "assessment": AssessmentAgent(),
        "memory": MemoryAgent(),
    }


@router.get("/career-readiness")
async def get_career_readiness(
    user_id: str = Query("user_default"),
    agents: Dict = Depends(get_agents),
):
    """Calculate career readiness score (0-100)"""
    try:
        assessment_agent = agents["assessment"]
        memory_agent = agents["memory"]

        user_context = memory_agent.get_user_context()
        result = assessment_agent.calculate_career_readiness_score(user_context)

        return {
            "user_id": user_id,
            "score": result["score"],
            "level": result["level"],
            "details": result["details"],
            "next_actions": result["next_actions"],
        }
    except Exception as e:
        return {"error": str(e), "score": 0}


@router.get("/recommendations")
async def get_recommendations(
    user_id: str = Query("user_default"),
    agents: Dict = Depends(get_agents),
):
    """Get detailed readiness recommendations"""
    try:
        assessment_agent = agents["assessment"]
        memory_agent = agents["memory"]

        user_context = memory_agent.get_user_context()
        recommendations = assessment_agent.get_readiness_recommendations(user_context)

        return recommendations
    except Exception as e:
        return {"error": str(e)}


@router.get("/report")
async def get_readiness_report(
    user_id: str = Query("user_default"),
    agents: Dict = Depends(get_agents),
):
    """Generate comprehensive readiness report"""
    try:
        assessment_agent = agents["assessment"]
        memory_agent = agents["memory"]

        user_context = memory_agent.get_user_context()
        report = assessment_agent.generate_readiness_report(user_context)

        return {
            "user_id": user_id,
            "report": report,
        }
    except Exception as e:
        return {"error": str(e), "report": ""}


@router.post("/job-fit")
async def calculate_job_fit(
    company: str = Query(...),
    role: str = Query(...),
    salary: str = Query(...),
    user_id: str = Query("user_default"),
    agents: Dict = Depends(get_agents),
):
    """Calculate fit score for a specific job"""
    try:
        assessment_agent = agents["assessment"]
        memory_agent = agents["memory"]

        job = {
            "company": company,
            "role": role,
            "salary": salary,
            "description": f"{role} at {company}",
        }

        user_context = memory_agent.get_user_context()
        score = assessment_agent.calculate_job_fit_score(job, user_context)

        return {
            "company": company,
            "role": role,
            "fit_score": score,
            "fit_level": "Perfect Match"
            if score >= 80
            else "Great Fit"
            if score >= 60
            else "Good Fit"
            if score >= 40
            else "Possible Fit",
        }
    except Exception as e:
        return {"error": str(e), "fit_score": 0}


@router.get("/public-widget")
async def get_public_widget():
    """Get embeddable readiness score widget (self-distributing asset)"""
    html = """
    <div style="width: 300px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white; text-align: center; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 10px 0;">Career Readiness Score</h3>
        <p style="margin: 10px 0; font-size: 14px;">Assess your job search readiness instantly</p>
        <a href="https://hustleos.dev/assessment" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: white; color: #667eea; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Take Assessment
        </a>
        <p style="margin-top: 15px; font-size: 12px; opacity: 0.9;">Powered by HustleOS</p>
    </div>
    """
    return {
        "widget_name": "Career Readiness Score",
        "html": html,
        "embed_code": f'<iframe src="https://hustleos.dev/widget/readiness" width="300" height="300" frameborder="0"></iframe>',
    }
