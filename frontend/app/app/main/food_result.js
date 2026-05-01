import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Bookmark, Camera, AlertCircle, History } from 'lucide-react-native';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { getFoodScanResult, clearFoodScanResult } from '../../lib/foodScanStore';

const STORAGE_KEY = '@medisense_food_history';

function calcNutrition(foods, nutritionMap) {
  const totals = { calories: 0, carbs: 0, protein: 0, fat: 0, sodium: 0 };
  for (const food of foods) {
    const base = nutritionMap[food.name];
    if (!base) continue;
    const grams = parseFloat(food.portion) || 100;
    const mult = grams / 100;
    totals.calories += (base.calories || 0) * mult;
    totals.carbs += (base.carbs || 0) * mult;
    totals.protein += (base.protein || 0) * mult;
    totals.fat += (base.fat || 0) * mult;
    totals.sodium += (base.sodium || 0) * mult;
  }
  return {
    calories: Math.round(totals.calories),
    carbs: Math.round(totals.carbs),
    protein: Math.round(totals.protein),
    fat: Math.round(totals.fat),
    sodium: Math.round(totals.sodium),
  };
}

function calcRisk(nutrition) {
  let diabetes = 'Low';
  if (nutrition.carbs > 80) diabetes = 'High';
  else if (nutrition.carbs > 45) diabetes = 'Moderate';

  let hypertension = 'Low';
  if (nutrition.sodium > 600) hypertension = 'High';
  else if (nutrition.sodium > 300) hypertension = 'Moderate';

  return { diabetes, hypertension };
}

function getRecommendations(risk, nutrition) {
  const recs = [];
  if (risk.diabetes === 'High') {
    recs.push('High carbohydrate intake detected. Consider reducing rice, sweets, and sugary drinks.');
    recs.push('Replace refined carbs with high-fibre alternatives (e.g. kurakkan, green vegetables).');
  } else if (risk.diabetes === 'Moderate') {
    recs.push('Moderate carbohydrate load. Pair carbs with protein or fibre to slow glucose absorption.');
  } else {
    recs.push('Your carbohydrate intake appears balanced for diabetes risk.');
  }
  if (risk.hypertension === 'High') {
    recs.push('High sodium intake detected. Limit processed and fried foods.');
    recs.push('Increase potassium-rich foods (coconut water, bananas, leafy greens).');
  } else if (risk.hypertension === 'Moderate') {
    recs.push('Moderate sodium level. Avoid extra salt and opt for home-cooked meals.');
  } else {
    recs.push('Sodium intake is within a healthy range for blood pressure.');
  }
  if (nutrition.fat > 25) {
    recs.push('Total fat is elevated. Prefer grilling, steaming, or boiling over deep-frying.');
  }
  if (nutrition.calories > 700) {
    recs.push('This meal is calorie-dense. A 30-minute walk can help offset energy balance.');
  }
  return recs;
}

function singleFoodNutrition(food, nutritionMap) {
  const base = nutritionMap[food.name];
  if (!base) return null;
  const grams = parseFloat(food.portion) || 100;
  const mult = grams / 100;
  return {
    calories: Math.round((base.calories || 0) * mult),
    carbs: Math.round((base.carbs || 0) * mult),
    protein: Math.round((base.protein || 0) * mult),
    fat: Math.round((base.fat || 0) * mult),
    sodium: Math.round((base.sodium || 0) * mult),
  };
}

export default function FoodResultScreen() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [pendingFoods, setPendingFoods] = useState([]);
  const [serverNutritionMap, setServerNutritionMap] = useState({});
  const [pendingImageUri, setPendingImageUri] = useState(null);

  // Re-read from store whenever this screen is focused so we always show the latest scan (no cached old result)
  useFocusEffect(
    useCallback(() => {
      const { pendingFoods: foods, serverNutritionMap: map, pendingImageUri: uri } = getFoodScanResult();
      setPendingFoods(foods);
      setServerNutritionMap(map);
      setPendingImageUri(uri);
    }, [])
  );

  const nutrition = calcNutrition(pendingFoods, serverNutritionMap);
  const hasNutritionData = !(
    nutrition.calories === 0 &&
    nutrition.carbs === 0 &&
    nutrition.protein === 0
  );
  const risk = hasNutritionData ? calcRisk(nutrition) : { diabetes: 'Low', hypertension: 'Low' };
  const recommendations = hasNutritionData ? getRecommendations(risk, nutrition) : [];

  useEffect(() => {
    if (pendingFoods.length === 0) {
      Alert.alert('No meal data', 'Please scan a meal first.', [
        { text: 'OK', onPress: () => router.replace('/main/food_scan') },
      ]);
    }
  }, [pendingFoods.length]);

  const handleSave = async () => {
    if (saved) return;
    const id = Date.now().toString();
    const record = {
      id,
      date: new Date().toISOString(),
      foods: pendingFoods,
      nutrition,
      risk,
    };
    try {
      if (auth.currentUser) {
        const mealRef = doc(collection(db, 'users', auth.currentUser.uid, 'food_meals'), id);
        await setDoc(mealRef, record);
      }
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const history = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...history]));
      setSaved(true);
      Alert.alert('Saved', 'This meal has been added to your history.');
    } catch (e) {
      console.error('Save meal error:', e);
      Alert.alert('Error', 'Could not save to history.');
    }
  };

  const handleScanAnother = () => {
    clearFoodScanResult();
    setSaved(false);
    router.replace('/main/food_scan');
  };

  if (pendingFoods.length === 0) return null;

  const foodSummary =
    pendingFoods.length === 1
      ? pendingFoods[0].name
      : `${pendingFoods[0].name} + ${pendingFoods.length - 1} more`;

  const riskColor = (level) => (level === 'High' ? '#f87171' : level === 'Moderate' ? '#fbbf24' : '#34d399');

  return (
    <View className="flex-1 bg-[#0f172a]">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ChevronLeft color="#38bdf8" size={24} />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">Nutrition Result</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          {/* Meal header */}
          <View className="flex-row items-center mb-6">
            <View className="w-14 h-14 bg-sky-500/20 rounded-2xl items-center justify-center mr-4">
              <Text className="text-2xl">🍽️</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg" numberOfLines={1}>{foodSummary}</Text>
              <Text className="text-slate-400 text-sm">
                {pendingFoods.length} item{pendingFoods.length !== 1 ? 's' : ''} ·{' '}
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Items analysed */}
          <Text className="text-white font-bold mb-3">Items Analysed</Text>
          <View className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
            {pendingFoods.map((food, i) => {
              const fn = singleFoodNutrition(food, serverNutritionMap);
              const hasData = fn !== null;
              return (
                <View
                  key={i}
                  className="p-4 border-b border-white/5"
                  style={i === pendingFoods.length - 1 ? { borderBottomWidth: 0 } : {}}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-white font-bold flex-1" numberOfLines={1}>{food.name}</Text>
                    {hasData ? (
                      <View className="bg-sky-500/20 rounded-lg px-2 py-1">
                        <Text className="text-sky-400 font-bold text-sm">{fn.calories} kcal</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center">
                        <AlertCircle color="#f87171" size={14} />
                        <Text className="text-red-400 text-sm ml-1">No data</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-slate-400 text-sm mb-2">{food.portion}g</Text>
                  {hasData && (
                    <View className="flex-row flex-wrap gap-4">
                      <Text className="text-slate-400 text-sm">Carbs {fn.carbs}g</Text>
                      <Text className="text-slate-400 text-sm">Protein {fn.protein}g</Text>
                      <Text className="text-slate-400 text-sm">Fat {fn.fat}g</Text>
                      <Text className="text-slate-400 text-sm">Sodium {fn.sodium}mg</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Nutrition summary */}
          <Text className="text-white font-bold mb-3">Nutrition Summary</Text>
          {nutrition.calories === 0 && nutrition.carbs === 0 && nutrition.protein === 0 && (
            <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <Text className="text-amber-200 text-sm">
                We don't have nutrition data for the selected items in our database. Totals below are only for items we could match.
              </Text>
            </View>
          )}
          <View className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <View className="items-center mb-4">
              <Text className="text-sky-400 text-4xl font-black">{nutrition.calories}</Text>
              <Text className="text-slate-400 text-sm">kcal</Text>
            </View>
            <View className="border-t border-white/10 pt-4">
              <View className="flex-row justify-between py-2">
                <Text className="text-slate-400">Carbohydrates</Text>
                <Text className="text-white font-bold">{nutrition.carbs} g</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-slate-400">Protein</Text>
                <Text className="text-white font-bold">{nutrition.protein} g</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-slate-400">Fat</Text>
                <Text className="text-white font-bold">{nutrition.fat} g</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-slate-400">Sodium</Text>
                <Text className="text-white font-bold">{nutrition.sodium} mg</Text>
              </View>
            </View>
          </View>

          {/* Risk assessment — only when we have nutrition data */}
          {hasNutritionData && (
            <>
              <Text className="text-white font-bold mb-3">Dietary Risk Assessment</Text>
              <Text className="text-slate-500 text-xs mb-3">
                Early-warning indicators based on this meal. Not a medical diagnosis.
              </Text>
              <View className="flex-row gap-3 mb-6">
                <View className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 items-center">
                  <Text className="text-slate-400 text-xs mb-1">Type 2 Diabetes</Text>
                  <View
                    className="rounded-lg px-3 py-1"
                    style={{ backgroundColor: riskColor(risk.diabetes) + '30' }}
                  >
                    <Text className="font-bold" style={{ color: riskColor(risk.diabetes) }}>
                      {risk.diabetes}
                    </Text>
                  </View>
                </View>
                <View className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 items-center">
                  <Text className="text-slate-400 text-xs mb-1">Hypertension</Text>
                  <View
                    className="rounded-lg px-3 py-1"
                    style={{ backgroundColor: riskColor(risk.hypertension) + '30' }}
                  >
                    <Text className="font-bold" style={{ color: riskColor(risk.hypertension) }}>
                      {risk.hypertension}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recommendations */}
              <Text className="text-white font-bold mb-3">Recommendations</Text>
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                {recommendations.map((rec, i) => (
                  <View key={i} className="flex-row py-2 border-b border-white/5" style={i === recommendations.length - 1 ? { borderBottomWidth: 0 } : {}}>
                    <Text className="text-slate-300 text-sm flex-1">{rec}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            className={`rounded-2xl py-4 flex-row items-center justify-center mb-3 ${saved ? 'bg-emerald-500/30' : 'bg-sky-500'}`}
            onPress={handleSave}
            disabled={saved}
            activeOpacity={0.88}
          >
            <Bookmark color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text className="text-white font-bold">{saved ? 'Saved to History' : 'Save to History'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-2xl py-4 flex-row items-center justify-center mb-3 border border-white/10"
            onPress={() => router.push('/main/food_history?from=result')}
            activeOpacity={0.88}
          >
            <History color="#34d399" size={20} style={{ marginRight: 8 }} />
            <Text className="text-emerald-400 font-bold">View History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-2xl py-4 flex-row items-center justify-center border border-sky-500/50"
            onPress={handleScanAnother}
            activeOpacity={0.88}
          >
            <Camera color="#38bdf8" size={20} style={{ marginRight: 8 }} />
            <Text className="text-sky-400 font-bold">Scan Another Meal</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
