import { API_CONFIG } from './api';

// Same Flask as chat/diabetes — base URL from api.js (.env EXPO_PUBLIC_API_BASE_URL).
export const FOOD_SERVER_URL = API_CONFIG.BASE_URL;

export function getPredictUrl() {
  return `${FOOD_SERVER_URL}/predict`;
}

export function getNutritionUrl(name) {
  return `${FOOD_SERVER_URL}/nutrition?name=${encodeURIComponent(name)}`;
}

export function getFoodsUrl() {
  return `${FOOD_SERVER_URL}/foods`;
}
