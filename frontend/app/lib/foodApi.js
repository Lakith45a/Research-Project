import { API_CONFIG } from './api';

// Same Flask app as chat/diabetes (port 5000). On a physical device, localhost is the phone,
// not your PC — use EXPO_PUBLIC_API_BASE_URL or the shared API_CONFIG.BASE_URL (e.g. localtunnel).
export const FOOD_SERVER_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || API_CONFIG.BASE_URL || 'https://slimy-lands-mate.loca.lt';

export function getPredictUrl() {
  return `${FOOD_SERVER_URL}/predict`;
}

export function getNutritionUrl(name) {
  return `${FOOD_SERVER_URL}/nutrition?name=${encodeURIComponent(name)}`;
}

export function getFoodsUrl() {
  return `${FOOD_SERVER_URL}/foods`;
}
