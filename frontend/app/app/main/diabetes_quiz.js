import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Activity, ChevronRight, Apple } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const questions = [
    {
        id: 'q1',
        title: '1. How often do you eat fresh fruits and vegetables?',
        options: [
            { label: 'Daily (multiple servings)', value: 10 },
            { label: 'Daily (small servings)', value: 6 },
            { label: 'Occasionally', value: 3 },
            { label: 'Rarely/never', value: 0 },
        ]
    },
    {
        id: 'q2',
        title: '2. How often do you consume processed or fast food?',
        options: [
            { label: 'Rarely/never', value: 10 },
            { label: 'Once a week', value: 6 },
            { label: 'Several times a week', value: 3 },
            { label: 'Daily', value: 0 },
        ]
    },
    {
        id: 'q3',
        title: '3. How much sugary drinks (soda, etc) do you drink?',
        options: [
            { label: 'None or rarely', value: 10 },
            { label: '1–3 per week', value: 6 },
            { label: 'Several per week', value: 3 },
            { label: 'Daily', value: 0 },
        ]
    },
    {
        id: 'q4',
        title: '4. How often do you eat whole grains?',
        options: [
            { label: 'Daily', value: 10 },
            { label: 'Several times a week', value: 6 },
            { label: 'Rarely', value: 3 },
            { label: 'Never', value: 0 },
        ]
    },
    {
        id: 'q5',
        title: '5. How often do you consume fried foods?',
        options: [
            { label: 'Rarely/never', value: 10 },
            { label: 'Once a week', value: 6 },
            { label: 'Several times a week', value: 3 },
            { label: 'Daily', value: 0 },
        ]
    }
];

export default function DiabetesQuizScreen() {
    const router = useRouter();
    const [answers, setAnswers] = useState({});

    useFocusEffect(
        useCallback(() => {
            setAnswers({});
        }, [])
    );

    const handleSelect = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleNext = () => {
        if (Object.keys(answers).length < questions.length) {
            Alert.alert('Incomplete', 'Please answer all questions before continuing.');
            return;
        }

        const sum = Object.values(answers).reduce((a, b) => a + b, 0);
        const mean = sum / questions.length;
        const score = Math.round(mean * 10) / 10;

        router.push({
            pathname: '/main/diabetes',
            params: { diet_score: score }
        });
    };

    return (
        <View className="flex-1 bg-[#0f172a]">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    className="flex-1 px-6 pt-6"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View entering={FadeInDown.duration(800)} className="mb-8 items-center mt-4">
                        <View className="w-20 h-20 bg-emerald-500/10 rounded-full items-center justify-center mb-6 border border-emerald-500/20">
                            <Activity color="#10b981" size={40} />
                        </View>
                        <Text className="text-white text-3xl font-black text-center">Diet Questionnaire</Text>
                        <Text className="text-slate-400 text-sm text-center mt-3 leading-5">
                            Answer these 5 quick questions to generate a diet quality score. You will then continue to the diabetes form.
                        </Text>
                    </Animated.View>

                    <View className="flex-col gap-8">
                        {questions.map((q, index) => (
                            <View key={q.id}>
                                <Text className="text-white text-base font-bold mb-4 ml-1">{q.title}</Text>
                                <View className="flex-col gap-3">
                                    {q.options.map(opt => {
                                        const isSelected = answers[q.id] === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.label}
                                                onPress={() => handleSelect(q.id, opt.value)}
                                                className={`py-3 px-4 rounded-2xl border flex-row items-center justify-between ${isSelected ? 'bg-sky-500 border-sky-500' : 'bg-white/5 border-white/10'
                                                    }`}
                                            >
                                                <Text className={`font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                    {opt.label}
                                                </Text>
                                                {isSelected && (
                                                    <View className="w-4 h-4 rounded-full bg-white items-center justify-center">
                                                        <View className="w-2 h-2 rounded-full bg-sky-500" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            className="rounded-[32px] overflow-hidden shadow-2xl shadow-emerald-500/20 mb-20 mt-4"
                            onPress={handleNext}
                        >
                            <LinearGradient
                                colors={['#10b981', '#059669']}
                                className="py-4 items-center"
                            >
                                <View className="flex-row items-center">
                                    <Text className="text-white font-black text-lg mr-2">CONTINUE TO SCAN</Text>
                                    <ChevronRight color="white" size={24} />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
