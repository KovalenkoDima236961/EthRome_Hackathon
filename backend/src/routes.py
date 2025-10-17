from fastapi import APIRouter

router = APIRouter()

@router.get("/api/health")
async def api_health() -> str:
    return "good"