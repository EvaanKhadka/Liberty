from fastapi import FastAPI
from src.modules.auth.router import router as auth_router
from src.modules.cms.router import router as cms_router




app=FastAPI()

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(cms_router, prefix="/cms", tags=["Content Management"])