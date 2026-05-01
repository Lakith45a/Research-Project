import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useRouter, useFocusEffect } from 'expo-router';
import { TrendingUp, TrendingDown, Minus, Activity, ArrowLeft, CalendarDays, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80;
const CHART_HEIGHT = 160;

const STAGE_CONFIG = {
    stage_1: { label: 'Stage 1', shortLabel: 'S1', numericValue: 1, color: '#38bdf8', bgClass: 'bg-sky-500/10', borderClass: 'border-sky-500/20', textClass: 'text-sky-400', description: 'Low Risk' },
    stage_2: { label: 'Stage 2', shortLabel: 'S2', numericValue: 2, color: '#fb923c', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/20', textClass: 'text-orange-400', description: 'Moderate Risk' },
    stage_3: { label: 'Stage 3', shortLabel: 'S3', numericValue: 3, color: '#fb7185', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/20', textClass: 'text-rose-400', description: 'High Risk' },
};

function getStageConfig(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('stage_3')) return STAGE_CONFIG.stage_3;
    if (s.includes('stage_2')) return STAGE_CONFIG.stage_2;
    return STAGE_CONFIG.stage_1;
}

function getTrendInfo(history) {
    if (history.length < 2) return { label: 'Not enough data', icon: 'neutral', color: '#94a3b8', description: 'Complete at least 2 assessments to see trends.' };

    const latest = getStageConfig(history[0].diabetes_status).numericValue;
    const previous = getStageConfig(history[1].diabetes_status).numericValue;

    if (latest < previous) return { label: 'Improving', icon: 'down', color: '#34d399', description: 'Your risk level has decreased since the last assessment.' };
    if (latest > previous) return { label: 'Worsening', icon: 'up', color: '#fb7185', description: 'Your risk level has increased. Consider reviewing your lifestyle habits.' };
    return { label: 'Stable', icon: 'neutral', color: '#fbbf24', description: 'Your risk level is unchanged from the last assessment.' };
}

function formatDate(isoString) {
    const d = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(isoString) {
    const d = new Date(isoString);
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

// Simple sparkline chart drawn with View components
function TrendChart({ history }) {
    if (history.length < 2) return null;

    const data = [...history].reverse(); // oldest first for left-to-right
    const maxPoints = Math.min(data.length, 10); // show last 10
    const displayData = data.slice(-maxPoints);
    const pointSpacing = CHART_WIDTH / (maxPoints - 1 || 1);

    // Y positions: stage 1 = bottom, stage 3 = top
    const getY = (status) => {
        const val = getStageConfig(status).numericValue;
        const padding = 20;
        return CHART_HEIGHT - padding - ((val - 1) / 2) * (CHART_HEIGHT - 2 * padding);
    };

    const points = displayData.map((item, i) => ({
        x: i * pointSpacing,
        y: getY(item.diabetes_status),
        config: getStageConfig(item.diabetes_status),
    }));

    return (
        <View className="mt-4 mb-2">
            {/* Y-axis labels */}
            <View className="flex-row">
                <View className="w-8 justify-between" style={{ height: CHART_HEIGHT }}>
                    <Text className="text-rose-400 text-[9px] font-bold">S3</Text>
                    <Text className="text-orange-400 text-[9px] font-bold">S2</Text>
                    <Text className="text-sky-400 text-[9px] font-bold">S1</Text>
                </View>

                {/* Chart area */}
                <View style={{ width: CHART_WIDTH, height: CHART_HEIGHT }} className="bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                    {/* Grid lines */}
                    <View className="absolute w-full border-b border-white/5" style={{ top: '33%' }} />
                    <View className="absolute w-full border-b border-white/5" style={{ top: '66%' }} />

                    {/* Connecting lines */}
                    {points.map((point, i) => {
                        if (i === 0) return null;
                        const prev = points[i - 1];
                        const dx = point.x - prev.x;
                        const dy = point.y - prev.y;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                        return (
                            <View
                                key={`line-${i}`}
                                className="absolute bg-sky-400/30"
                                style={{
                                    left: prev.x + 12,
                                    top: prev.y + 5,
                                    width: length,
                                    height: 2,
                                    borderRadius: 1,
                                    transform: [{ rotate: `${angle}deg` }],
                                    transformOrigin: 'left center',
                                }}
                            />
                        );
                    })}

                    {/* Data points */}
                    {points.map((point, i) => (
                        <View
                            key={`point-${i}`}
                            className="absolute items-center justify-center"
                            style={{ left: point.x + 4, top: point.y - 3 }}
                        >
                            <View
                                className="w-4 h-4 rounded-full border-2"
                                style={{
                                    backgroundColor: point.config.color + '33',
                                    borderColor: point.config.color,
                                }}
                            />
                        </View>
                    ))}
                </View>
            </View>

            {/* X-axis labels (first and last date) */}
            <View className="flex-row justify-between ml-8 mt-2">
                <Text className="text-slate-500 text-[9px]">{formatDate(displayData[0].timestamp)}</Text>
                <Text className="text-slate-500 text-[9px]">{formatDate(displayData[displayData.length - 1].timestamp)}</Text>
            </View>
        </View>
    );
}

export default function DiabetesDashboardScreen() {
    const router = useRouter();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchHistory();
        }, [])
    );

    const fetchHistory = async () => {
        setLoading(true);
        try {
            if (!auth.currentUser) return;
            const historyRef = collection(db, 'diabetes_results', auth.currentUser.uid, 'history');
            const q = query(historyRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistory(records);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-[#0f172a] items-center justify-center">
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text className="text-slate-400 mt-4 font-medium">Loading your health data...</Text>
            </View>
        );
    }

    // Empty state
    if (history.length === 0) {
        return (
            <View className="flex-1 bg-[#0f172a] items-center justify-center p-8">
                <View className="w-24 h-24 bg-sky-500/10 rounded-full items-center justify-center mb-6 border border-sky-500/20">
                    <Activity color="#38bdf8" size={48} />
                </View>
                <Text className="text-white text-2xl font-black text-center mb-3">No Assessments Yet</Text>
                <Text className="text-slate-400 text-sm text-center leading-6 mb-8">
                    Complete your first diabetes risk assessment to start tracking your health journey over time.
                </Text>
                <TouchableOpacity
                    className="rounded-[24px] overflow-hidden w-full"
                    onPress={() => router.push('/main/diabetes_quiz')}
                >
                    <LinearGradient colors={['#0ea5e9', '#2563eb']} className="py-4 items-center">
                        <Text className="text-white font-black text-base">Take First Assessment</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    const latest = history[0];
    const latestConfig = getStageConfig(latest.diabetes_status);
    const trend = getTrendInfo(history);

    return (
        <View className="flex-1 bg-[#0f172a]">
            {/* Background Decorative Blur Circles */}
            <View className="absolute top-[-50] right-[-50] w-[250] h-[250] rounded-full bg-sky-600/10 blur-[100px]" />
            <View className="absolute bottom-[-50] left-[-50] w-[300] h-[300] rounded-full bg-indigo-600/10 blur-[120px]" />

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(600)} className="mb-6">
                    <Text className="text-slate-400 text-sm font-medium">Diabetes Monitoring</Text>
                    <Text className="text-white text-3xl font-black">Risk Dashboard</Text>
                </Animated.View>

                {/* Current Status Card */}
                <Animated.View entering={FadeInDown.duration(800).delay(100)}>
                    <View className={`${latestConfig.bgClass} border ${latestConfig.borderClass} rounded-[32px] p-6 mb-5`}>
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Current Risk Level</Text>
                            <Text className="text-slate-500 text-[10px]">{formatDate(latest.timestamp)}</Text>
                        </View>
                        <Text className={`text-4xl font-black ${latestConfig.textClass} mb-1`}>
                            {latestConfig.label}
                        </Text>
                        <Text className={`${latestConfig.textClass} text-sm opacity-70`}>
                            {latestConfig.description}
                        </Text>

                        {/* Key Metrics */}
                        <View className="flex-row mt-4 gap-3">
                            {latest.input?.bmi && (
                                <View className="bg-white/5 rounded-2xl px-4 py-2 flex-1">
                                    <Text className="text-slate-500 text-[9px] font-bold uppercase">BMI</Text>
                                    <Text className="text-white font-black text-lg">{latest.input.bmi}</Text>
                                </View>
                            )}
                            {latest.input?.age && (
                                <View className="bg-white/5 rounded-2xl px-4 py-2 flex-1">
                                    <Text className="text-slate-500 text-[9px] font-bold uppercase">Age</Text>
                                    <Text className="text-white font-black text-lg">{latest.input.age}</Text>
                                </View>
                            )}
                            <View className="bg-white/5 rounded-2xl px-4 py-2 flex-1">
                                <Text className="text-slate-500 text-[9px] font-bold uppercase">Scans</Text>
                                <Text className="text-white font-black text-lg">{history.length}</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Trend Indicator Card */}
                <Animated.View entering={FadeInDown.duration(800).delay(200)}>
                    <View className="bg-white/5 border border-white/10 rounded-[28px] p-5 mb-5 flex-row items-center">
                        <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                            style={{ backgroundColor: trend.color + '20' }}
                        >
                            {trend.icon === 'down' && <TrendingDown color={trend.color} size={24} />}
                            {trend.icon === 'up' && <TrendingUp color={trend.color} size={24} />}
                            {trend.icon === 'neutral' && <Minus color={trend.color} size={24} />}
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-base" style={{ color: trend.color }}>{trend.label}</Text>
                            <Text className="text-slate-500 text-xs leading-4 mt-0.5">{trend.description}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Trend Chart */}
                {history.length >= 2 && (
                    <Animated.View entering={FadeInUp.duration(800).delay(300)}>
                        <View className="bg-white/5 border border-white/10 rounded-[28px] p-5 mb-5">
                            <Text className="text-white font-bold text-base mb-1">Risk Timeline</Text>
                            <Text className="text-slate-500 text-xs mb-2">Showing last {Math.min(history.length, 10)} assessments</Text>
                            <TrendChart history={history} />
                        </View>
                    </Animated.View>
                )}

                {/* Assessment History */}
                <Animated.View entering={FadeInUp.duration(800).delay(400)}>
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-white text-lg font-bold">Assessment History</Text>
                        <Text className="text-slate-500 text-xs">{history.length} total</Text>
                    </View>

                    <View className="flex-col gap-3 mb-6">
                        {history.map((item, index) => {
                            const cfg = getStageConfig(item.diabetes_status);
                            return (
                                <View key={item.id || index} className="bg-white/5 border border-white/10 rounded-[24px] p-4 flex-row items-center">
                                    <View className={`w-10 h-10 rounded-xl ${cfg.bgClass} items-center justify-center mr-4 border ${cfg.borderClass}`}>
                                        <Text className={`font-black text-xs ${cfg.textClass}`}>{cfg.shortLabel}</Text>
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row items-center justify-between">
                                            <Text className={`font-bold text-sm ${cfg.textClass}`}>{cfg.label} — {cfg.description}</Text>
                                        </View>
                                        <View className="flex-row items-center mt-1 gap-3">
                                            <Text className="text-slate-500 text-[10px]">
                                                <CalendarDays size={10} color="#64748b" /> {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
                                            </Text>
                                            {item.input?.bmi && (
                                                <Text className="text-slate-500 text-[10px]">BMI: {item.input.bmi}</Text>
                                            )}
                                        </View>
                                    </View>
                                    {index === 0 && (
                                        <View className="bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30">
                                            <Text className="text-emerald-400 text-[9px] font-black">LATEST</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Action Buttons */}
                <View className="flex-row gap-4 mb-20">
                    <TouchableOpacity
                        className="flex-1 rounded-[24px] overflow-hidden"
                        onPress={() => router.replace('/main/diabetes_quiz')}
                    >
                        <LinearGradient colors={['#0f172a', '#1e293b']} className="py-4 items-center border border-white/10 rounded-[24px]">
                            <Text className="text-white font-bold text-sm">New Scan</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 rounded-[24px] overflow-hidden"
                        onPress={() => router.replace('/main')}
                    >
                        <LinearGradient colors={['#0ea5e9', '#2563eb']} className="py-4 items-center rounded-[24px]">
                            <Text className="text-white font-bold text-sm">Go Home</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
