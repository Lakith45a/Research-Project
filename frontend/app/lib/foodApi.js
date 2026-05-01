// Uses the same backend server as the rest of the app.
export const FOOD_SERVER_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export function getPredictUrl() {
  return `${FOOD_SERVER_URL}/predict`;
}

export function getNutritionUrl(name) {
  return `${FOOD_SERVER_URL}/nutrition?name=${encodeURIComponent(name)}`;
}

export function getFoodsUrl() {
  return `${FOOD_SERVER_URL}/foods`;
}
