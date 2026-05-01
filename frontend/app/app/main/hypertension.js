import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getApiUrl, API_CONFIG } from '../../lib/api';
import { Heart, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HypertensionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Fallback scores
    const initialStressScore = params.stress_score ? String(params.stress_score) : '0';
    const initialSaltScore = params.salt_score ? String(params.salt_score) : '0';

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        age: '',
        height: '',
        weight: '',
        sleep_hours: '',
        bp: 'Normal',
        family_history: 'No',
        smoke: 'Non-Smoker',
        salt: initialSaltScore,
        stress_score: initialStressScore,
    });

    useFocusEffect(
        useCallback(() => {
            const loadProfile = async () => {
                let profileAge = '';
                let profileHeight = '';
                let profileWeight = '';
                try {
                    if (auth.currentUser) {
                        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                        if (userDoc.exists()) {
                            const profile = userDoc.data().healthProfile;
                            if (profile) {
                                profileAge = profile.age ? String(profile.age) : '';
                                profileHeight = profile.height ? String(profile.height) : '';
                                profileWeight = profile.weight ? String(profile.weight) : '';
                            }
                        }
                    }
                } catch (e) {
                    console.log('Could not load health profile:', e);
                }
                setFormData({
                    age: profileAge,
                    height: profileHeight,
                    weight: profileWeight,
                    sleep_hours: '',
                    bp: 'Normal',
                    family_history: 'No',
                    smoke: 'Non-Smoker',
                    salt: params.salt_score ? String(params.salt_score) : '0',
                    stress_score: params.stress_score ? String(params.stress_score) : '0',
                });
            };
            loadProfile();
        }, [params.stress_score, params.salt_score])
    );

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const calculateBMI = () => {
        const h = parseFloat(formData.height);
        const w = parseFloat(formData.weight);
        if (!h || !w) return 0;
        const m = h / 100.0;
        return (w / (m * m)).toFixed(1);
    };

    const handleSubmit = async () => {
        if (!formData.age || !formData.height || !formData.weight || !formData.sleep_hours || !formData.stress_score || !formData.salt) {
            Alert.alert('Incomplete Data', 'Please fill in all clinical fields including stress and salt scores.');
            return;
        }

        const ageNum = parseFloat(formData.age);
        const heightNum = parseFloat(formData.height);
        const weightNum = parseFloat(formData.weight);
        const sleepNum = parseFloat(formData.sleep_hours);

        if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
            Alert.alert('Invalid Age', 'Please enter a valid age (1-120).');
            return;
        }
        if (isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
            Alert.alert('Invalid Height', 'Please enter a valid height in cm.');
            return;
        }
        if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
            Alert.alert('Invalid Weight', 'Please enter a valid weight in kg.');
            return;
        }
        if (isNaN(sleepNum) || sleepNum < 0 || sleepNum > 24) {
            Alert.alert('Invalid Sleep Hours', 'Please enter valid sleep hours (0-24).');
            return;
        }

        setLoading(true);
        const bmi = calculateBMI();

        const payload = {
            age: parseFloat(formData.age),
            height: parseFloat(formData.height),
            weight: parseFloat(formData.weight),
            salt: parseFloat(formData.salt) || 0,
            // stress_score: parseFloat(formData.stress_score) || 0,
            bp: formData.bp,
            sleep_hours: parseFloat(formData.sleep_hours),
            bmi: parseFloat(bmi),
            family_history: formData.family_history,
            smoke: formData.smoke
        };

        console.log('--- Hypertension API Request ---');
        console.log('Payload:', JSON.stringify(payload, null, 2));

        try {
            const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.HYPERTENSION_CHECK), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to fetch result');

            const data = await response.json();

            console.log('--- Hypertension API Response ---');
            console.log('Data:', JSON.stringify(data, null, 2));

            if (data.success === false) {
                throw new Error(data.error || 'The screening request could not be processed.');
            }

            if (auth.currentUser) {
                await setDoc(doc(db, 'hypertension_results', auth.currentUser.uid), {
                    ...data,
                    timestamp: new Date().toISOString(),
                    input: payload
                }, { merge: true });
            }

            router.push({
                pathname: '/main/hypertension_result',
                params: { data: JSON.stringify(data) }
            });
        } catch (error) {
            console.error(error);
            Alert.alert('Connection Error', 'Could not reach the AI screening server. Please verify it is running on your machine.');
        } finally {
            setLoading(false);
        }
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
                    <Animated.View entering={FadeInDown.duration(800)} className="mb-8">
                        <Text className="text-slate-400 text-base font-medium">Step 2 of 2</Text>
                        <Text className="text-white text-3xl font-black">Clinical Data</Text>
                    </Animated.View>

                    <View className="flex-col gap-8">
                        <View className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex-col gap-6">
                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Current Age</Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                        keyboardType="numeric"
                                        placeholder="45"
                                        placeholderTextColor="#475569"
                                        value={formData.age}
                                        onChangeText={(v) => updateField('age', v)}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Sleep (Hours)</Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                        keyboardType="numeric"
                                        placeholder="7"
                                        placeholderTextColor="#475569"
                                        value={formData.sleep_hours}
                                        onChangeText={(v) => updateField('sleep_hours', v)}
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Height (cm)</Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                        keyboardType="numeric"
                                        placeholder="170"
                                        placeholderTextColor="#475569"
                                        value={formData.height}
                                        onChangeText={(v) => updateField('height', v)}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Weight (kg)</Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                        keyboardType="numeric"
                                        placeholder="70"
                                        placeholderTextColor="#475569"
                                        value={formData.weight}
                                        onChangeText={(v) => updateField('weight', v)}
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Stress (0-10)</Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor="#475569"
                                        value={formData.stress_score}
                                        onChangeText={(v) => updateField('stress_score', v)}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Salt (0-10)</Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor="#475569"
                                        value={formData.salt}
                                        onChangeText={(v) => updateField('salt', v)}
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Calculated BMI</Text>
                                <View className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 flex-row justify-between items-center">
                                    <Text className="text-rose-400 font-bold text-sm">{calculateBMI() > 0 ? calculateBMI() : 'Enter height & weight'}</Text>
                                    <Text className="text-rose-400/60 text-xs">Auto-calculated</Text>
                                </View>
                            </View>
                        </View>

                        <View>
                            <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-4 ml-1">Recent Blood Pressure</Text>
                            <View className="flex-row gap-2">
                                {['Normal', 'Prehypertension', 'Hypertension'].map(v => (
                                    <TouchableOpacity
                                        key={v}
                                        onPress={() => updateField('bp', v)}
                                        className={`flex-1 py-3 rounded-2xl border ${formData.bp === v ? 'bg-rose-500 border-rose-500' : 'bg-white/5 border-white/10'}`}
                                    >
                                        <Text className={`text-center font-bold text-[9px] uppercase tracking-tighter ${formData.bp === v ? 'text-white' : 'text-slate-400'}`}>{v}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View>
                            <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-4 ml-1">Lifestyle Factors</Text>
                            <View className="flex-col gap-4">
                                <View className="flex-row gap-3">
                                    <View className="flex-1">
                                        <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2 ml-1">Family History</Text>
                                        <View className="flex-row gap-2">
                                            {['Yes', 'No'].map(v => (
                                                <TouchableOpacity key={v} onPress={() => updateField('family_history', v)} className={`flex-1 py-3 rounded-xl border ${formData.family_history === v ? 'bg-indigo-500 border-indigo-500' : 'bg-white/5 border-white/10'}`}>
                                                    <Text className={`text-center text-[10px] font-bold ${formData.family_history === v ? 'text-white' : 'text-slate-400'}`}>{v}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2 ml-1">Smoking</Text>
                                        <View className="flex-row gap-2">
                                            {['Non-Smoker', 'Smoker'].map(v => (
                                                <TouchableOpacity key={v} onPress={() => updateField('smoke', v)} className={`flex-1 py-3 px-1 rounded-xl border ${formData.smoke === v ? 'bg-indigo-500 border-indigo-500' : 'bg-white/5 border-white/10'}`}>
                                                    <Text className={`text-center text-[9px] font-bold ${formData.smoke === v ? 'text-white' : 'text-slate-400'}`}>{v}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            className="rounded-[32px] overflow-hidden shadow-2xl shadow-rose-500/20 mb-20 mt-4"
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#f43f5e', '#e11d48']}
                                className="py-4 items-center"
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <View className="flex-row items-center">
                                        <Text className="text-white font-black text-lg mr-2">START CARDIAC SCAN</Text>
                                        <ChevronRight color="white" size={24} />
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
