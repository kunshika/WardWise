import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import engine, Base
from .routers import auth, users, rooms, bookings

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WardWise - Hospital Room Booking System",
    description="Centralized hospital room booking and management API.",
    version="1.0.0"
)

# CORS middleware configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(bookings.router)

# Mount frontend build static files if they exist
frontend_build_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))

if os.path.exists(frontend_build_path):
    # Serve index.html for root path
    @app.get("/")
    def read_index():
        return FileResponse(os.path.join(frontend_build_path, "index.html"))

    # Mount static assets
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_build_path, "assets")), name="assets")

    # Fallback to index.html for SPA routing (any non-API request)
    @app.middleware("http")
    async def spa_fallback_middleware(request: Request, call_next):
        response = await call_next(request)
        if response.status_code == 404 and not request.url.path.startswith("/api/"):
            return FileResponse(os.path.join(frontend_build_path, "index.html"))
        return response
else:
    @app.get("/")
    def read_root():
        return {"message": "WardWise API is running. Build frontend to view interface here."}
