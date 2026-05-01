import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { auth, db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { DAILY_SODIUM_LIMIT_MG, DAILY_CARBS_LIMIT_G } from '../../lib/healthLimits';

const STORAGE_KEY = '@medisense_food_history';
const CHART_DAYS = 14;
const CHART_HEIGHT = 200;
const CHART_PADDING = { left: 36, right: 16, top: 8, bottom: 32 };

/** Aggregate meals by day (last N days) using local date so chart matches saved meal dates. Returns [{ dateKey, dateLabel, sodium, carbs }, ...] oldest first. */
function aggregateByDay(meals) {
  const byDay = {};
  for (const meal of meals) {
    if (!meal.date || !meal.nutrition) continue;
    const d = new Date(meal.date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    if (!byDay[key]) byDay[key] = { dateKey: key, sodium: 0, carbs: 0 };
    byDay[key].sodium += meal.nutrition.sodium || 0;
    byDay[key].carbs += meal.nutrition.carbs || 0;
  }
  const sorted = Object.values(byDay).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const last = sorted.slice(-CHART_DAYS);
  return last.map((row) => {
    const [y, m, d] = row.dateKey.split('-').map(Number);
    return {
      ...row,
      dateLabel: new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
  });
}

/** Round to nice step for Y-axis (e.g. 1000 -> 1000, 2500 -> 2500 or 3000). */
function niceMax(val) {
  if (val <= 0) return 100;
  const scale = Math.pow(10, Math.floor(Math.log10(val)));
  const normalized = val / scale;
  if (normalized <= 1) return scale;
  if (normalized <= 2) return 2 * scale;
  if (normalized <= 5) return 5 * scale;
  return 10 * scale;
}

/** Dual-line chart: individual meal values (one dot per meal) + overall cumulative line (one after another). */
function DualLineChart({ individualValues, overallValues, limit, label, limitLabel, width, mealLabels }) {
  const hasData = individualValues && individualValues.length > 0;
  const n = hasData ? individualValues.length : 5;
  const indiv = hasData ? individualValues : [0, 0, 0, 0, 0];
  const overall = hasData ? overallValues : [0, 0, 0, 0, 0];
  const labels = (mealLabels && mealLabels.length === n) ? mealLabels : (hasData ? Array.from({ length: n }, (_, i) => `Meal ${i + 1}`) : ['', 'No data yet', '', '', '']);
  const padding = CHART_PADDING;
  const chartWidth = Math.max(0, width - padding.left - padding.right);
  const chartHeight = CHART_HEIGHT - padding.top - padding.bottom;
  const maxVal = Math.max(limit, ...indiv, ...overall, 1);
  const yMax = niceMax(maxVal);
  const yStep = yMax / 5;

  const toPoints = (values) =>
    values.map((val, i) => {
      const x = padding.left + (i / Math.max(1, values.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (val / yMax) * chartHeight;
      return { x, y };
    });
  const pointsIndiv = toPoints(indiv);
  const pointsOverall = toPoints(overall);
  const pathIndiv = pointsIndiv.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const pathOverall = pointsOverall.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const limitY = padding.top + chartHeight - Math.min(limit / yMax, 1) * chartHeight;

  const colorIndiv = '#38bdf8';
  const colorOverall = '#34d399';

  return (
    <View className="bg-slate-800/50 border border-white/10 rounded-2xl p-4 mb-4">
      <Text className="text-white font-bold text-base mb-0.5">{label}</Text>
      <Text className="text-slate-400 text-xs mb-1">{limitLabel} daily limit (WHO)</Text>
      <View className="flex-row flex-wrap gap-4 mb-2">
        <View className="flex-row items-center">
          <View className="w-3 h-0.5 bg-sky-400 rounded" />
          <Text className="text-sky-400 text-xs ml-1">Per meal</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-0.5 bg-emerald-400 rounded" />
          <Text className="text-emerald-400 text-xs ml-1">Cumulative</Text>
        </View>
      </View>
      <Svg width={width} height={CHART_HEIGHT}>
        {/* Y-axis */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = padding.top + chartHeight - (i / 5) * chartHeight;
          const v = Math.round(i * yStep);
          return (
            <React.Fragment key={i}>
              <Line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="#334155" strokeWidth={0.5} />
              <SvgText x={padding.left - 6} y={y + 4} fill="#94a3b8" fontSize={10} textAnchor="end">{v}</SvgText>
            </React.Fragment>
          );
        })}
        {/* X-axis labels */}
        {labels.map((text, i) => {
          const x = padding.left + (i / Math.max(1, labels.length - 1)) * chartWidth;
          return (
            <SvgText key={i} x={x} y={CHART_HEIGHT - 8} fill="#94a3b8" fontSize={9} textAnchor="middle">{text}</SvgText>
          );
        })}
        {/* Limit line */}
        {limit <= yMax && (
          <Line x1={padding.left} y1={limitY} x2={width - padding.right} y2={limitY} stroke="#64748b" strokeWidth={1} strokeDasharray="4,2" />
        )}
        {/* Overall (cumulative) line - drawn first so it's under */}
        <Path d={pathOverall} fill="none" stroke={colorOverall} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {pointsOverall.map((p, i) => (
          <Circle key={`o-${i}`} cx={p.x} cy={p.y} r={4} fill={colorOverall} stroke="#0f172a" strokeWidth={1.5} />
        ))}
        {/* Individual (per meal) line */}
        <Path d={pathIndiv} fill="none" stroke={colorIndiv} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {pointsIndiv.map((p, i) => (
          <Circle key={`i-${i}`} cx={p.x} cy={p.y} r={4} fill={colorIndiv} stroke="#0f172a" strokeWidth={1.5} />
        ))}
      </Svg>
      {!hasData && (
        <Text className="text-slate-500 text-xs mt-2 text-center">Save meals to see per-meal and cumulative intake.</Text>
      )}
    </View>
  );
}

export default function FoodHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromRoute = params.from; // 'result' | 'scan' when opened from Food Result or Food Scan
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const chartWidth = Dimensions.get('window').width - 48;

  const handleBack = () => {
    if (fromRoute === 'result') {
      router.replace('/main/food_result');
    } else if (fromRoute === 'scan') {
      router.replace('/main/food_scan');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/main/food_scan');
    }
  };

  const loadMeals = useCallback(async () => {
    try {
      if (auth.currentUser) {
        const mealsRef = collection(db, 'users', auth.currentUser.uid, 'food_meals');
        const snap = await getDocs(mealsRef);
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setMeals(list);
      } else {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        setMeals(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('Load food history error:', e);
      setMeals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMeals();
    }, [loadMeals])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMeals();
  };

  const handleDelete = async (id) => {
    if (auth.currentUser) {
      deleteDoc(doc(db, 'users', auth.currentUser.uid, 'food_meals', id))
        .then(() => loadMeals())
        .catch((e) => console.error('Delete meal error:', e));
    } else {
      const next = meals.filter((m) => m.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setMeals(next);
    }
  };

  const summary = (meal) => {
    if (!meal.foods || meal.foods.length === 0) return 'Meal';
    if (meal.foods.length === 1) return meal.foods[0].name;
    return `${meal.foods[0].name} + ${meal.foods.length - 1} more`;
  };

  const dateStr = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return '';
    }
  };

  // Meals in chronological order (oldest first) so chart shows "first meal, second meal, ..."
  const mealsChronological = useMemo(
    () => [...meals].filter((m) => m.nutrition).sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [meals]
  );
  const mealLabels = useMemo(
    () => mealsChronological.map((m, i) => `Meal ${i + 1}`),
    [mealsChronological]
  );
  const individualSodium = useMemo(
    () => mealsChronological.map((m) => Math.round(m.nutrition?.sodium || 0)),
    [mealsChronological]
  );
  const overallSodium = useMemo(() => {
    let sum = 0;
    return mealsChronological.map((m) => {
      sum += m.nutrition?.sodium || 0;
      return Math.round(sum);
    });
  }, [mealsChronological]);
  const individualCarbs = useMemo(
    () => mealsChronological.map((m) => Math.round(m.nutrition?.carbs || 0)),
    [mealsChronological]
  );
  const overallCarbs = useMemo(() => {
    let sum = 0;
    return mealsChronological.map((m) => {
      sum += m.nutrition?.carbs || 0;
      return Math.round(sum);
    });
  }, [mealsChronological]);

  if (loading && meals.length === 0) {
    return (
      <View className="flex-1 bg-[#0f172a] justify-center items-center">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="text-slate-400 mt-4">Loading history…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0f172a]">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
          <TouchableOpacity onPress={handleBack} className="p-2">
            <ChevronLeft color="#38bdf8" size={24} />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">Food History</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
          }
        >
          {meals.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-slate-400 text-center">No saved meals yet.</Text>
              <Text className="text-slate-500 text-sm mt-2 text-center">
                Scan a meal and tap "Save to History" to see it here.
              </Text>
              <TouchableOpacity
                className="mt-6 bg-sky-500 rounded-2xl py-3 px-6"
                onPress={() => router.replace('/main/food_scan')}
              >
                <Text className="text-white font-bold">Scan meal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text className="text-white font-bold text-base mb-2">Daily intake vs WHO limits</Text>
              <Text className="text-slate-500 text-xs mb-1">
                Sodium &lt; {DAILY_SODIUM_LIMIT_MG} mg/day · Carbs ~{DAILY_CARBS_LIMIT_G} g/day (healthy adult reference)
              </Text>
              <Text className="text-slate-500 text-xs mb-3">Per meal (blue) and cumulative (green) as you add meals.</Text>
              <DualLineChart
                individualValues={individualSodium}
                overallValues={overallSodium}
                limit={DAILY_SODIUM_LIMIT_MG}
                label="Sodium (mg)"
                limitLabel={`${DAILY_SODIUM_LIMIT_MG} mg`}
                width={chartWidth}
                mealLabels={mealLabels}
              />
              <DualLineChart
                individualValues={individualCarbs}
                overallValues={overallCarbs}
                limit={DAILY_CARBS_LIMIT_G}
                label="Carbohydrates (g)"
                limitLabel={`${DAILY_CARBS_LIMIT_G} g`}
                width={chartWidth}
                mealLabels={mealLabels}
              />
              <Text className="text-white font-bold text-base mb-3 mt-2">Saved meals</Text>
              {meals.map((meal) => (
              <View
                key={meal.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3 flex-row items-center"
              >
                <View className="flex-1">
                  <Text className="text-white font-bold" numberOfLines={1}>
                    {summary(meal)}
                  </Text>
                  <Text className="text-slate-400 text-sm mt-1">{dateStr(meal.date)}</Text>
                  {meal.nutrition && (
                    <View className="flex-row items-center mt-2">
                      <Flame color="#f59e0b" size={14} />
                      <Text className="text-amber-400/90 text-xs ml-1">
                        {meal.nutrition.calories} kcal · C {meal.nutrition.carbs}g P {meal.nutrition.protein}g
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  className="p-2"
                  onPress={() => handleDelete(meal.id)}
                >
                  <Text className="text-red-400 text-sm">Delete</Text>
                </TouchableOpacity>
                <ChevronRight color="#64748b" size={20} />
              </View>
            ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
