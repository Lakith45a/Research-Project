import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function DiabetesResultScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    let result = null;
    try {
        if (params.data) {
            result = JSON.parse(params.data);
        }
    } catch (e) {
        console.error("Failed to parse result data", e);
    }

    if (!result) {
        return (
            <View className="flex-1 bg-[#0f172a] items-center justify-center p-6">
                <Text className="text-slate-400 mb-4 text-center">No result data found. Please submit the form first.</Text>
                <TouchableOpacity onPress={() => router.replace('/main/diabetes')} className="bg-sky-500 py-3 px-6 rounded-xl">
                    <Text className="text-white font-bold">Back to Form</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const getStatusInfo = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('stage_3')) return { label: 'Stage 3 (High Risk)', color: 'text-rose-400', bg: 'bg-rose-500/10', iconColor: '#fb7185' };
        if (s.includes('stage_2')) return { label: 'Stage 2 (Moderate)', color: 'text-orange-400', bg: 'bg-orange-500/10', iconColor: '#fb923c' };
        if (s.includes('stage_1')) return { label: 'Stage 1 (Mild Risk)', color: 'text-sky-400', bg: 'bg-sky-500/10', iconColor: '#38bdf8' };
        return { label: status || 'Normal', color: 'text-emerald-400', bg: 'bg-emerald-500/10', iconColor: '#10b981' };
    };

    const info = getStatusInfo(result.diabetes_status || result.status);

    // Extract probability from the probabilities map based on the status
    const statusKey = result.diabetes_status || result.status || '';
    let probValue = 0;
    if (result.probabilities && result.probabilities[statusKey] !== undefined) {
        probValue = result.probabilities[statusKey];
    } else {
        probValue = result.probability || result.prob || 0;
    }
    const prob = Math.round(probValue * 100);

    // Enhanced Recommendation 
    const parseContent = (text) => {
        if (!text) return { intro: '', points: [], note: '' };

        // Split into main sections: Intro, Points, and Note
        const sections = text.split(/\n\nn\d\./);
        const intro = sections[0].trim();
        let remaining = sections.slice(1);

        let note = "";
        let points = remaining.map((p, idx) => {
            let cleanPoint = p.trim();
            // Check if the last point contains the "Remember" note
            if (idx === remaining.length - 1 && cleanPoint.includes('Remember')) {
                const parts = cleanPoint.split(/Remember/);
                cleanPoint = parts[0].trim();
                note = "Remember" + parts[1];
            }
            return cleanPoint;
        });

        return { intro, points, note };
    };

    const { intro, points, note } = parseContent(result.recommendations);

    // Helper to render text with bold segments
    const renderStyledText = (text, textClass) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return (
            <Text className={textClass}>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                            <Text key={i} className="font-black text-white">
                                {part.slice(2, -2)}
                            </Text>
                        );
                    }
                    return <Text key={i}>{part}</Text>;
                })}
            </Text>
        );
    };

    return (
        <View className="flex-1 bg-[#0f172a]">
            {/* Background Decorative Blur Circles */}
            <View className="absolute top-[-50] right-[-50] w-[250] h-[250] rounded-full bg-sky-600/10 blur-[100px]" />
            <View className="absolute bottom-[-50] left-[-50] w-[300] h-[300] rounded-full bg-indigo-600/10 blur-[120px]" />
            <ScrollView className="flex-1 p-6">
                <Animated.View entering={FadeInDown.duration(800)} className="items-center mt-10 mb-8">
                    <View className={`w-24 h-24 ${info.bg} rounded-full items-center justify-center mb-6`}>
                        <CheckCircle2 color={info.iconColor} size={48} />
                    </View>
                    <Text className="text-white text-3xl font-black">Diabetes Analysis</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(1000).delay(200)} className="bg-white/5 border border-white/10 p-8 rounded-[40px] mb-8">
                    <Text className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Staging Analysis</Text>
                    <Text className={`text-4xl font-black ${info.color} mb-2 capitalize`}>
                        {info.label}
                    </Text>
                    {/* <Text className="text-slate-500 text-sm font-medium mb-4">
                        Probability Score: {prob}%
                    </Text> */}
                    <View className="h-[2] w-full bg-white/5 mb-6" />

                    {intro ? (
                        <Text className="text-white text-lg font-bold mb-6 leading-7">{intro}</Text>
                    ) : null}

                    <View className="flex-col gap-4 mb-8">
                        {points.map((point, idx) => (
                            <View key={idx} className="bg-white/5 border border-white/5 p-5 rounded-[24px]">
                                <View className="flex-row items-start">
                                    <View className="w-8 h-8 rounded-full bg-sky-500/20 items-center justify-center mr-3">
                                        <Text className="text-sky-400 font-black text-xs">{idx + 1}</Text>
                                    </View>
                                    <View className="flex-1">
                                        {renderStyledText(point, "text-slate-400 text-sm leading-6")}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    {note ? (
                        <View className="bg-sky-500/10 p-6 rounded-[28px] border border-sky-500/20">
                            <Text className="text-sky-400 text-xs leading-5 font-bold italic">
                                {note}
                            </Text>
                        </View>
                    ) : null}
                </Animated.View>

                <View className="flex-col gap-3">
                    <TouchableOpacity
                        className="rounded-[24px] overflow-hidden"
                        onPress={() => router.push('/main/diabetes_dashboard')}
                    >
                        <LinearGradient colors={['#6366f1', '#4f46e5']} className="py-5 items-center">
                            <Text className="text-white font-bold text-base">📊 View Risk Dashboard</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            className="flex-1 rounded-[24px] overflow-hidden"
                            onPress={() => router.replace('/main/diabetes_quiz')}
                        >
                            <LinearGradient colors={['#0f172a', '#1e293b']} className="py-5 items-center border border-white/10">
                                <Text className="text-white font-bold text-base">New Scan</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 rounded-[24px] overflow-hidden"
                            onPress={() => router.replace('/main')}
                        >
                            <LinearGradient colors={['#0ea5e9', '#2563eb']} className="py-5 items-center">
                                <Text className="text-white font-bold text-base">Go Home</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="h-20" />
            </ScrollView>
        </View >
    );
}
