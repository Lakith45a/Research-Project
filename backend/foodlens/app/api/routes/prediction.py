from fastapi import APIRouter, File, UploadFile

from app.services.inference_service import process_image


router = APIRouter()


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    print(f"\nReceived image: {file.filename}")
    return await process_image(file)


@router.post("/scan")
async def scan(image: UploadFile = File(...)):
    print(f"\nReceived image: {image.filename}")
    return await process_image(image)
