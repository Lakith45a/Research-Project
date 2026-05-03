import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { getApiUrl, API_CONFIG, apiFetch } from '../../lib/api';
import { Activity, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

export default function DiabetesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Fallback diet score
    const initialDietScore = params.diet_score ? String(params.diet_score) : '0';

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        age: '',
        gender: 'Female',
        height: '',
        weight: '',
        waist_circumference: '',
        diet_food_habits: initialDietScore,
        blood_pressure: 'No',
        cholesterol_lipid_levels: 'No',
        vision_changes: 'No',
    });

    useFocusEffect(
        useCallback(() => {
            const loadProfile = async () => {
                let profileAge = '';
                let profileGender = 'Female';
                let profileHeight = '';
                let profileWeight = '';
                try {
                    if (auth.currentUser) {
                        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                        if (userDoc.exists()) {
                            const profile = userDoc.data().healthProfile;
                            if (profile) {
                                profileAge = profile.age ? String(profile.age) : '';
                                profileGender = profile.gender || 'Female';
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
                    gender: profileGender,
                    height: profileHeight,
                    weight: profileWeight,
                    waist_circumference: '',
                    diet_food_habits: params.diet_score ? String(params.diet_score) : '0',
                    blood_pressure: 'No',
                    cholesterol_lipid_levels: 'No',
                    vision_changes: 'No',
                });
            };
            loadProfile();
        }, [params.diet_score])
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
        if (!formData.age || !formData.height || !formData.weight || !formData.waist_circumference || !formData.diet_food_habits) {
            Alert.alert('Incomplete Data', 'Please fill in all clinical fields including your diet score to continue.');
            return;
        }

        const ageNum = parseFloat(formData.age);
        const heightNum = parseFloat(formData.height);
        const weightNum = parseFloat(formData.weight);
        const waistNum = parseFloat(formData.waist_circumference);

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
        if (isNaN(waistNum) || waistNum <= 0 || waistNum > 150) {
            Alert.alert('Invalid Waist', 'Please enter a valid waist circumference in inches.');
            return;
        }

        setLoading(true);
        const bmi = calculateBMI();

        const payload = {
            age: parseFloat(formData.age),
            gender: formData.gender === 'Male' ? 1 : 0,
            height: parseFloat(formData.height),
            weight: parseFloat(formData.weight),
            waist_circumference: parseFloat(formData.waist_circumference),
            diet_food_habits: parseFloat(formData.diet_food_habits),
            blood_pressure: formData.blood_pressure === 'Yes' ? 1 : 0,
            cholesterol_lipid_levels: formData.cholesterol_lipid_levels === 'Yes' ? 1 : 0,
            vision_changes: formData.vision_changes === 'Yes' ? 1 : 0,
            bmi: parseFloat(bmi)
        };

        console.log('--- Diabetes API Request ---');
        console.log('Payload:', JSON.stringify(payload, null, 2));

        try {
            const response = await apiFetch(getApiUrl(API_CONFIG.ENDPOINTS.DIABETES_CHECK), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to fetch staging result');

            const data = await response.json();

            console.log('--- Diabetes API Response ---');
            console.log('Data:', JSON.stringify(data, null, 2));

            if (data.success === false) {
                throw new Error(data.error || 'The screening request could not be processed.');
            }

            if (auth.currentUser) {
                await addDoc(
                    collection(db, 'diabetes_results', auth.currentUser.uid, 'history'),
                    {
                        ...data,
                        timestamp: new Date().toISOString(),
                        input: payload
                    }
                );
            }

            router.push({
                pathname: '/main/diabetes_result',
                params: { data: JSON.stringify(data) }
            });
        } catch (error) {
            console.error(error);
            Alert.alert('Connection Error', 'Could not reach the AI screening server. Please verify it is running on your machine.');
        } finally {
            setLoading(false);
        }
    };

    const ToggleButton = ({ label, field, options = ['Yes', 'No'] }) => (
        <View className="mb-4">
            <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-3 ml-1">{label}</Text>
            <View className="flex-row gap-3">
                {options.map(v => (
                    <TouchableOpacity
                        key={v}
                        onPress={() => updateField(field, v)}
                        className={`flex-1 py-3 rounded-2xl border ${formData[field] === v ? 'bg-sky-500 border-sky-500' : 'bg-white/5 border-white/10'}`}
                    >
                        <Text className={`text-center font-bold text-xs uppercase ${formData[field] === v ? 'text-white' : 'text-slate-400'}`}>{v}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

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
                        <Text className="text-white text-3xl font-black">Biometric Data</Text>
                    </Animated.View>

                    <View className="flex-col gap-8">
                        {/* Numeric Section */}
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
                                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Waist (inches)</Text>
                                    <TextInput
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                        keyboardType="numeric"
                                        placeholder="34"
                                        placeholderTextColor="#475569"
                                        value={formData.waist_circumference}
                                        onChangeText={(v) => updateField('waist_circumference', v)}
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

                            <View>
                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Diet Score (0-10)</Text>
                                <TextInput
                                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                    keyboardType="numeric"
                                    placeholder="Rate from 0 to 10"
                                    placeholderTextColor="#475569"
                                    value={formData.diet_food_habits}
                                    onChangeText={(v) => updateField('diet_food_habits', v)}
                                />
                            </View>

                            <View>
                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Calculated BMI</Text>
                                <View className="bg-sky-500/10 border border-sky-500/20 rounded-2xl px-4 py-3 flex-row justify-between items-center">
                                    <Text className="text-sky-400 font-bold text-sm">{calculateBMI() > 0 ? calculateBMI() : 'Enter height & weight'}</Text>
                                    <Text className="text-sky-400/60 text-xs">Auto-calculated</Text>
                                </View>
                            </View>
                        </View>

                        <Text className="text-white text-xl font-bold ml-1">Clinical Factors</Text>

                        <View className="flex-col gap-2">
                            <ToggleButton label="What is your gender?" field="gender" options={['Female', 'Male']} />
                            <ToggleButton label="Diagnosed with high blood pressure?" field="blood_pressure" />
                            <ToggleButton label="High cholesterol / abnormal lipid levels?" field="cholesterol_lipid_levels" />
                            <ToggleButton label="Recently experienced vision changes?" field="vision_changes" />
                        </View>

                        <TouchableOpacity
                            className="rounded-[32px] overflow-hidden shadow-2xl shadow-sky-500/20 mb-20 mt-4"
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#0ea5e9', '#2563eb']}
                                className="py-4 items-center"
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <View className="flex-row items-center">
                                        <Text className="text-white font-black text-lg mr-2">RUN AI VALIDATION</Text>
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
