from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routers import guest, owner

API_PREFIX = "/api"

app = FastAPI(
    title="Appointment Booking API",
    version="1.0.0",
    openapi_url=f"{API_PREFIX}/openapi.json",
    docs_url=f"{API_PREFIX}/docs",
    redoc_url=f"{API_PREFIX}/redoc",
    swagger_ui_oauth2_redirect_url=f"{API_PREFIX}/docs/oauth2-redirect",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": detail["code"], "message": detail["message"]},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": "ERROR", "message": str(detail)},
    )


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    if not errors:
        message = "Request validation failed"
    else:
        first_error = errors[0]
        location = ".".join(
            str(part)
            for part in first_error.get("loc", ())
            if part not in {"body", "query"}
        )
        reason = str(first_error.get("msg", "Invalid value"))
        message = f"{location}: {reason}" if location else reason

    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "message": message},
    )


app.include_router(guest.router, prefix=API_PREFIX)
app.include_router(owner.router, prefix=API_PREFIX)
