/**
 * In-memory store for passing scan result from food_scan to food_result
 * (avoids large navigation params or a separate Context).
 */

let pendingFoods = [];
let serverNutritionMap = {};
let pendingImageUri = null;

export function setFoodScanResult(foods, nutritionMap, imageUri) {
  pendingFoods = foods || [];
  serverNutritionMap = nutritionMap || {};
  pendingImageUri = imageUri ?? null;
}

export function getFoodScanResult() {
  return {
    pendingFoods: [...pendingFoods],
    serverNutritionMap: { ...serverNutritionMap },
    pendingImageUri,
  };
}

export function clearFoodScanResult() {
  pendingFoods = [];
  serverNutritionMap = {};
  pendingImageUri = null;
}
