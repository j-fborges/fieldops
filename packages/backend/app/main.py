"""FieldOps Backend — application entry point and health check."""

from fastapi import FastAPI

app = FastAPI(
    title="FieldOps API",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    """Health check endpoint. Returns 200 when the application is running."""
    return {"status": "ok"}
