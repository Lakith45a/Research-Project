import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Activity, Heart, User, ChevronRight, LogOut, Bell, Flame, ShieldCheck, MessageSquare, BarChart3 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchUserData = async () => {
        try {
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUserData();
    };

    return (
        <View className="flex-1 bg-[#0f172a]">
            {/* Background Decorative Blur Circles */}
            <View className="absolute top-[-50] right-[-50] w-[250] h-[250] rounded-full bg-sky-600/20 blur-[100px]" />
            <View className="absolute bottom-[-50] left-[-50] w-[300] h-[300] rounded-full bg-indigo-600/20 blur-[120px]" />
            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
            >
                {/* Header Section */}
                <View className="px-6 pt-8 pb-8">
                    <View className="flex-row items-center justify-between mb-8">
                        <View className="flex-row items-center gap-2">
                            <View className="w-10 h-10 bg-indigo-500/20 rounded-xl items-center justify-center">
                                <Activity color="#818cf8" size={20} />
                            </View>
                            <Text className="text-white text-xl font-black tracking-tight">MediSense</Text>
                        </View>
                        <TouchableOpacity className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl items-center justify-center">
                            <Bell color="#f8fafc" size={20} />
                        </TouchableOpacity>
                    </View>

                    <View className="mb-6">
                        <Text className="text-slate-400 text-base font-medium">Welcome back,</Text>
                        <Text className="text-white text-3xl font-black">
                            {userData?.name?.split(' ')[0] || 'User'}
                        </Text>
                    </View>


                    {/* Health Profile Card */}
                    <Animated.View entering={FadeInDown.duration(800).delay(100)}>
                        <TouchableOpacity
                            className="bg-emerald-500/10 border border-emerald-500/20 rounded-[28px] p-5 flex-row items-center mb-6"
                            onPress={() => router.push('/main/health_profile')}
                        >
                            <View className="w-12 h-12 bg-emerald-500/20 rounded-2xl items-center justify-center mr-4">
                                <User color="#10b981" size={24} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-emerald-400 font-bold text-base">Health Profile</Text>
                                <Text className="text-emerald-400/50 text-xs mt-0.5">Save your data once, auto-fill your forms</Text>
                            </View>
                            <View className="bg-emerald-500/20 p-2 rounded-xl">
                                <ChevronRight color="#10b981" size={18} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    <Text className="text-white text-xl font-bold mb-4 ml-1">Health Screenings</Text>

                    <View className="flex-col gap-4">
                        <Animated.View entering={FadeInRight.duration(800).delay(200)}>
                            <TouchableOpacity
                                className="bg-white/5 border border-white/10 rounded-[28px] p-5 flex-row items-center"
                                onPress={() => router.push('/main/diabetes_quiz')}
                            >
                                <View className="w-14 h-14 bg-sky-500/10 rounded-2xl items-center justify-center mr-4 border border-sky-500/20">
                                    <Activity color="#38bdf8" size={28} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-white">Diabetes Staging</Text>
                                    <Text className="text-slate-500 text-xs mt-1">AI Risk Stratification</Text>
                                </View>
                                <View className="bg-white/5 p-2 rounded-xl">
                                    <ChevronRight color="#475569" size={20} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInRight.duration(800).delay(400)}>
                            <TouchableOpacity
                                className="bg-white/5 border border-white/10 rounded-[28px] p-5 flex-row items-center"
                                onPress={() => router.push('/main/hypertension_quiz')}
                            >
                                <View className="w-14 h-14 bg-rose-500/10 rounded-2xl items-center justify-center mr-4 border border-rose-500/20">
                                    <Heart color="#f43f5e" size={28} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-white">Cardiac Scan</Text>
                                    <Text className="text-slate-500 text-xs mt-1">Hypertension Validation</Text>
                                </View>
                                <View className="bg-white/5 p-2 rounded-xl">
                                    <ChevronRight color="#475569" size={20} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInRight.duration(800).delay(600)}>
                            <TouchableOpacity
                                className="bg-white/5 border border-white/10 rounded-[28px] p-5 flex-row items-center"
                                onPress={() => router.push('/main/chat')}
                            >
                                <View className="w-14 h-14 bg-indigo-500/10 rounded-2xl items-center justify-center mr-4 border border-indigo-500/20">
                                    <MessageSquare color="#818cf8" size={28} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-white">Chat with AI</Text>
                                    <Text className="text-slate-500 text-xs mt-1">Symptom Assessment</Text>
                                </View>
                                <View className="bg-white/5 p-2 rounded-xl">
                                    <ChevronRight color="#475569" size={20} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    <Text className="text-white text-xl font-bold mb-4 ml-1 mt-8">Health Insights</Text>

                    <Animated.View entering={FadeInRight.duration(800).delay(800)}>
                        <TouchableOpacity
                            className="bg-white/5 border border-white/10 rounded-[28px] p-5 flex-row items-center"
                            onPress={() => router.push('/main/diabetes_dashboard')}
                        >
                            <View className="w-14 h-14 bg-indigo-500/10 rounded-2xl items-center justify-center mr-4 border border-indigo-500/20">
                                <BarChart3 color="#818cf8" size={28} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-white">Risk Dashboard</Text>
                                <Text className="text-slate-500 text-xs mt-1">Track diabetes trends over time</Text>
                            </View>
                            <View className="bg-white/5 p-2 rounded-xl">
                                <ChevronRight color="#475569" size={20} />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(1000).delay(1000)} className="bg-indigo-500/10 border border-indigo-500/20 rounded-[28px] p-6 mt-6 flex-row items-center">
                        <View className="mr-4">
                            <ShieldCheck color="#818cf8" size={32} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-indigo-400 font-bold text-lg">System Secure</Text>
                            <Text className="text-indigo-400/60 text-xs leading-4">
                                Your health data is encrypted and stored securely on cloud servers.
                            </Text>
                        </View>
                    </Animated.View>

                    <TouchableOpacity
                        className="flex-row items-center justify-center mt-12 py-4 bg-white/5 border border-white/10 rounded-2xl"
                        onPress={() => auth.signOut().then(() => router.replace('/auth/login'))}
                    >
                        <LogOut color="#64748b" size={20} className="mr-2" />
                        <Text className="text-slate-400 font-bold ml-2">Sign Out</Text>
                    </TouchableOpacity>

                    <View className="h-10" />
                </View>
            </ScrollView>
        </View>
    );
}
