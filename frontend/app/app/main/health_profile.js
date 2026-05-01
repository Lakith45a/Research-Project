import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter, useFocusEffect } from 'expo-router';
import { User, Mail, ChevronRight, CheckCircle2, Save } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function HealthProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        age: '',
        height: '',
        weight: '',
        gender: 'Female',
    });

    useFocusEffect(
        useCallback(() => {
            loadProfile();
            setSaved(false);
        }, [])
    );

    const loadProfile = async () => {
        setLoading(true);
        try {
            if (!auth.currentUser) return;
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                const profile = data.healthProfile;
                setFormData(prev => ({
                    ...prev,
                    name: data.name || '',
                    email: data.email || auth.currentUser?.email || '',
                    age: profile?.age ? String(profile.age) : '',
                    height: profile?.height ? String(profile.height) : '',
                    weight: profile?.weight ? String(profile.weight) : '',
                    gender: profile?.gender || 'Female',
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    email: auth.currentUser?.email || '',
                }));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const calculateBMI = () => {
        const h = parseFloat(formData.height);
        const w = parseFloat(formData.weight);
        if (!h || !w) return 0;
        const m = h / 100.0;
        return (w / (m * m)).toFixed(1);
    };

    const getBMICategory = (bmi) => {
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-sky-400' };
        if (bmi < 25) return { label: 'Normal', color: 'text-emerald-400' };
        if (bmi < 30) return { label: 'Overweight', color: 'text-orange-400' };
        return { label: 'Obese', color: 'text-rose-400' };
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Incomplete', 'Please enter your name.');
            return;
        }
        if (!formData.age || !formData.height || !formData.weight) {
            Alert.alert('Incomplete', 'Please fill in age, height, and weight at minimum.');
            return;
        }

        const ageNum = parseFloat(formData.age);
        const heightNum = parseFloat(formData.height);
        const weightNum = parseFloat(formData.weight);

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

        setSaving(true);
        try {
            if (!auth.currentUser) return;
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                name: formData.name.trim(),
                healthProfile: {
                    age: ageNum,
                    height: heightNum,
                    weight: weightNum,
                    gender: formData.gender,
                    updatedAt: new Date().toISOString(),
                }
            }, { merge: true });

            setSaved(true);
            Alert.alert('Saved ✓', 'Your health profile has been updated.');
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-[#0f172a] items-center justify-center">
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text className="text-slate-400 mt-4 font-medium">Loading profile...</Text>
            </View>
        );
    }

    const bmi = calculateBMI();
    const bmiNum = parseFloat(bmi);
    const bmiCategory = bmiNum > 0 ? getBMICategory(bmiNum) : null;

    return (
        <View className="flex-1 bg-[#0f172a]">
            <View className="absolute top-[-50] right-[-50] w-[250] h-[250] rounded-full bg-emerald-600/10 blur-[100px]" />
            <View className="absolute bottom-[-50] left-[-50] w-[300] h-[300] rounded-full bg-indigo-600/10 blur-[120px]" />

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
                    {/* Header */}
                    <Animated.View entering={FadeInDown.duration(600)} className="items-center mb-8 mt-4">
                        <View className="w-20 h-20 bg-emerald-500/10 rounded-full items-center justify-center mb-4 border border-emerald-500/20">
                            <User color="#10b981" size={40} />
                        </View>
                        <Text className="text-white text-3xl font-black text-center">Health Profile</Text>
                        <Text className="text-slate-400 text-sm text-center mt-2 leading-5 px-4">
                                Manage your health profile
                        </Text>
                    </Animated.View>

                    {/* Personal Details */}
                    <Animated.View entering={FadeInUp.duration(800).delay(100)}>
                        <View className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex-col gap-5 mb-5">
                            <Text className="text-white text-lg font-bold">Personal Details</Text>

                            {/* Name */}
                            <View>
                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</Text>
                                <View className="bg-white/5 border border-white/10 rounded-2xl flex-row items-center px-4">
                                    <User color="#475569" size={18} />
                                    <TextInput
                                        className="flex-1 px-3 py-3 text-white font-medium text-sm"
                                        placeholder="Enter your name"
                                        placeholderTextColor="#475569"
                                        value={formData.name}
                                        onChangeText={(v) => updateField('name', v)}
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View>
                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</Text>
                                <View className="bg-white/5 border border-white/10 rounded-2xl flex-row items-center px-4">
                                    <Mail color="#475569" size={18} />
                                    <Text className="flex-1 px-3 py-3.5 text-slate-400 font-medium text-sm">
                                        {formData.email || 'Not available'}
                                    </Text>
                                </View>
                                <Text className="text-slate-600 text-[10px] mt-1.5 ml-1">Login email cannot be changed here</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Health Data */}
                    <Animated.View entering={FadeInUp.duration(800).delay(300)}>
                        <View className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex-col gap-6">
                            <Text className="text-white text-lg font-bold">Health Data</Text>

                            {/* Age */}
                            <View>
                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Age</Text>
                                <TextInput
                                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium text-sm"
                                    keyboardType="numeric"
                                    placeholder="Enter your age"
                                    placeholderTextColor="#475569"
                                    value={formData.age}
                                    onChangeText={(v) => updateField('age', v)}
                                />
                            </View>

                            {/* Gender */}
                            <View>
                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Gender</Text>
                                <View className="flex-row gap-3">
                                    {['Female', 'Male'].map(v => (
                                        <TouchableOpacity
                                            key={v}
                                            onPress={() => updateField('gender', v)}
                                            className={`flex-1 py-3 rounded-2xl border ${formData.gender === v ? 'bg-emerald-500 border-emerald-500' : 'bg-white/5 border-white/10'}`}
                                        >
                                            <Text className={`text-center font-bold text-xs uppercase ${formData.gender === v ? 'text-white' : 'text-slate-400'}`}>{v}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Height & Weight */}
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

                            {/* BMI Display */}
                            <View>
                                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Calculated BMI</Text>
                                <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 flex-row justify-between items-center">
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-emerald-400 font-bold text-sm">
                                            {bmiNum > 0 ? bmi : 'Enter height & weight'}
                                        </Text>
                                        {bmiCategory && (
                                            <Text className={`text-xs font-bold ${bmiCategory.color}`}>
                                                — {bmiCategory.label}
                                            </Text>
                                        )}
                                    </View>
                                    <Text className="text-emerald-400/60 text-xs">Auto</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Info Card */}
                    <Animated.View entering={FadeInUp.duration(800).delay(400)}>
                        <View className="bg-sky-500/10 border border-sky-500/20 rounded-[24px] p-4 mt-5 flex-row items-start">
                            <CheckCircle2 color="#38bdf8" size={18} className="mt-0.5 mr-3" />
                            <Text className="text-sky-400/80 text-xs leading-5 flex-1 ml-2">
                                These values will auto-fill when you start a Diabetes or Hypertension screening. You can always edit them in the form before submitting.
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Save Button */}
                    <Animated.View entering={FadeInUp.duration(800).delay(500)}>
                        <TouchableOpacity
                            className="rounded-[32px] overflow-hidden shadow-2xl shadow-emerald-500/20 mt-6 mb-20"
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <LinearGradient
                                colors={saved ? ['#10b981', '#059669'] : ['#0ea5e9', '#2563eb']}
                                className="py-4 items-center"
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <View className="flex-row items-center">
                                        {saved ? (
                                            <>
                                                <CheckCircle2 color="white" size={20} />
                                                <Text className="text-white font-black text-lg ml-2">Profile Saved ✓</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Save color="white" size={20} />
                                                <Text className="text-white font-black text-lg ml-2">Save Health Profile</Text>
                                            </>
                                        )}
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
