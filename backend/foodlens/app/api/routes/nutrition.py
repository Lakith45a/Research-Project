from fastapi import APIRouter

from app.services.nutrition_service import get_nutrition_by_name_response, list_food_names


router = APIRouter()


@router.get("/nutrition")
async def get_nutrition_by_name(name: str):
    return get_nutrition_by_name_response(name)


@router.get("/foods")
async def list_known_foods():
    return list_food_names()
