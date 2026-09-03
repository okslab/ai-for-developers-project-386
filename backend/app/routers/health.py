import os

from fastapi import APIRouter

from ..models import HealthResponse

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        revision=os.environ.get("APP_REVISION") or "unknown",
    )
