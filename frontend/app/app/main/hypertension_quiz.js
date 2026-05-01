import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Heart, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const questions = [
    {
        id: 'q1',
        title: '1. How often do you feel overwhelmed by tasks?',
        options: [
            { label: 'Very often', value: 10 },
            { label: 'Sometimes', value: 6 },
            { label: 'Rarely', value: 3 },
            { label: 'Never', value: 0 },
        ]
    },
    {
        id: 'q2',
        title: '2. How well do you sleep most nights?',
        options: [
            { label: 'Very well', value: 0 },
            { label: 'Fair', value: 3 },
            { label: 'Poor', value: 6 },
            { label: 'Very poor', value: 10 },
        ]
    },
    {
        id: 'q3',
        title: '3. How often do you feel anxious or worried?',
        options: [
            { label: 'Very often', value: 10 },
            { label: 'Sometimes', value: 6 },
            { label: 'Rarely', value: 3 },
            { label: 'Never', value: 0 },
        ]
    },
    {
        id: 'q4',
        title: '4. How often do you use unhealthy coping mechanisms?',
        options: [
            { label: 'Very often', value: 10 },
            { label: 'Sometimes', value: 6 },
            { label: 'Rarely', value: 3 },
            { label: 'Never', value: 0 },
        ]
    },
    {
        id: 'q5',
        title: '5. How supported do you feel by friends/family?',
        options: [
            { label: 'Very supported', value: 0 },
            { label: 'Somewhat supported', value: 3 },
            { label: 'Not much support', value: 6 },
            { label: 'No support', value: 10 },
        ]
    },
    {
        id: 'q6',
        title: '6. How much salt do you typically add/use in your diet?',
        options: [
            { label: 'Rarely/never (low)', value: 0 },
            { label: 'Occasionally', value: 4 },
            { label: 'Often', value: 7 },
            { label: 'Daily/high', value: 10 },
        ]
    }
];

export default function HypertensionQuizScreen() {
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

        const stressAnswers = [answers.q1, answers.q2, answers.q3, answers.q4, answers.q5];
        const stressSum = stressAnswers.reduce((a, b) => a + b, 0);
        const stressMean = stressSum / stressAnswers.length;

        const stressScore = Math.round(stressMean * 10) / 10;
        const saltScore = answers.q6; // Directly mapping value

        router.push({
            pathname: '/main/hypertension',
            params: {
                stress_score: stressScore,
                salt_score: saltScore
            }
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
                        <View className="w-20 h-20 bg-rose-500/10 rounded-full items-center justify-center mb-6 border border-rose-500/20">
                            <Heart color="#f43f5e" size={40} />
                        </View>
                        <Text className="text-white text-3xl font-black text-center">Lifestyle Questionnaire</Text>
                        <Text className="text-slate-400 text-sm text-center mt-3 leading-5">
                            Answer six quick questions covering stress, salt intake and coping behaviours. This computes a personalized stress & salt score.
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
                                                className={`py-3 px-4 rounded-2xl border flex-row items-center justify-between ${isSelected ? 'bg-rose-500 border-rose-500' : 'bg-white/5 border-white/10'
                                                    }`}
                                            >
                                                <Text className={`font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                    {opt.label}
                                                </Text>
                                                {isSelected && (
                                                    <View className="w-4 h-4 rounded-full bg-white items-center justify-center">
                                                        <View className="w-2 h-2 rounded-full bg-rose-500" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            className="rounded-[32px] overflow-hidden shadow-2xl shadow-rose-500/20 mb-20 mt-4"
                            onPress={handleNext}
                        >
                            <LinearGradient
                                colors={['#f43f5e', '#e11d48']}
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
