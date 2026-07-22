from fastapi import FastAPI
from src.modules.auth.router import router as auth_router
from src.modules.cms.router import router as cms_router
from src.core.config import Settings
from src.core.database import engine, Base




app=FastAPI()

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(cms_router, prefix="/cms", tags=["Content Management"])