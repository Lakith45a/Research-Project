import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Mail, Lock, History } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const getFriendlyError = (code) => {
        switch (code) {
            case 'auth/user-not-found': return 'No account found with this email.';
            case 'auth/wrong-password': return 'Incorrect password. Please try again.';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            case 'auth/network-request-failed': return 'Network error. Please check your connection.';
            default: return 'Authentication failed. Please try again.';
        }
    };

    const handleLogin = async () => {
        try {
            setLoading(true);
            setError('');
            if (!email || !password) {
                setError('Email and password are required');
                setLoading(false);
                return;
            }
            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();
            await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
            router.replace('/main');
        } catch (err) {
            setError(getFriendlyError(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Email Required', 'Please enter your email address to reset your password.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email.trim());
            Alert.alert('Reset Email Sent', 'Check your inbox for instructions to reset your password.');
        } catch (err) {
            setError(getFriendlyError(err.code));
        }
    };

    return (
        <View className="flex-1 bg-[#0f172a]">
            <View className="absolute top-[-50] left-[-50] w-[250] h-[250] rounded-full bg-indigo-600/20 blur-[100px]" />
            <View className="absolute bottom-[-50] right-[-50] w-[300] h-[300] rounded-full bg-sky-600/20 blur-[120px]" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    className="px-6"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View entering={FadeInUp.duration(1000).delay(200)} className="items-center mb-10">
                        <View className="w-20 h-20 bg-indigo-600 rounded-[24px] items-center justify-center mb-6 shadow-2xl shadow-indigo-500/50">
                            <Activity color="white" size={40} />
                        </View>
                        <Text className="text-4xl font-black text-white tracking-tight">MediSense</Text>
                        <Text className="text-slate-400 mt-2 text-center text-lg">
                            Advanced Health Intelligence
                        </Text>
                    </Animated.View>

                    <Animated.View
                        entering={FadeInDown.duration(1000).delay(400)}
                        className="bg-white/5 border border-white/10 rounded-[40px] p-8 overflow-hidden"
                    >
                        <Text className="text-2xl font-bold text-white mb-6">Welcome Back</Text>

                        <View className="flex-col gap-5">
                            <View>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</Text>
                                <View className="bg-white/5 border border-white/10 rounded-2xl flex-row items-center px-4">
                                    <Mail color="#475569" size={20} />
                                    <TextInput
                                        className="flex-1 px-3 py-4 text-white font-medium"
                                        placeholder="your@email.com"
                                        placeholderTextColor="#64748b"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <View>
                                <View className="flex-row justify-between items-center mb-2 ml-1">
                                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</Text>
                                    <TouchableOpacity onPress={handleForgotPassword}>
                                        <Text className="text-sky-400 text-xs font-bold">Forgot?</Text>
                                    </TouchableOpacity>
                                </View>
                                <View className="bg-white/5 border border-white/10 rounded-2xl flex-row items-center px-4">
                                    <Lock color="#475569" size={20} />
                                    <TextInput
                                        className="flex-1 px-3 py-4 text-white font-medium"
                                        placeholder="••••••••"
                                        placeholderTextColor="#64748b"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            {error ? (
                                <Animated.View entering={FadeInUp} className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                                    <Text className="text-rose-400 text-xs font-medium text-center">{error}</Text>
                                </Animated.View>
                            ) : null}

                            <TouchableOpacity
                                className={`rounded-2xl overflow-hidden mt-2 shadow-xl ${loading ? 'opacity-70' : ''}`}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={['#4f46e5', '#3b82f6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    className="py-5 items-center"
                                >
                                    <Text className="text-white font-bold text-lg">{loading ? 'Verifying...' : 'Sign In'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <View className="flex-row justify-center mt-2">
                                <Text className="text-slate-500">Don't have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/auth/register')}>
                                    <Text className="text-sky-400 font-bold">Create one</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                    <View className="h-10" />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
