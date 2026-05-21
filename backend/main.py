from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from routers import events, availability, bookings, meetings
import models  # noqa: F401 - ensure models are registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    from seed import seed_database
    seed_database()
    yield


app = FastAPI(title="Calendly Clone API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(availability.router, prefix="/api/availability", tags=["availability"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Calendly Clone API"}
