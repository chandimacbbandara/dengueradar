import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.predict import router as predict_router

app = FastAPI(
    title="DengueRadar ML Inference Service",
    description="Inference API using LightGBM + XGBoost + CatBoost 3-model stacking ensemble",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "service": "DengueRadar ML Inference API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
