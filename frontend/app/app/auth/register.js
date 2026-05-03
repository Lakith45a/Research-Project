import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { UserPlus, Mail, Lock, User, CheckCircle2 } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

const AVAILABLE_HOBBIES = [
    'Reading', 'Gaming', 'Sports', 'Music', 'Cooking',
    'Traveling', 'Art', 'Photography', 'Writing', 'Fitness',
    'Dancing', 'Gardening'
];

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [hobbies, setHobbies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const [location, setLocation] = useState('');

    const getFriendlyError = (code) => {
        switch (code) {
            case 'auth/email-already-in-use': return 'This email is already registered.';
            case 'auth/weak-password': return 'Password should be at least 6 characters.';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            default: return 'Registration failed. Please try again.';
        }
    };

    const handleRegister = async () => {
        try {
            setLoading(true);
            setError('');
            if (!name || !email || !password) {
                setError('Please fill in all fields');
                setLoading(false);
                return;
            }
            if (!location) {
                setError('Please select your location');
                setLoading(false);
                return;
            }
            if (hobbies.length < 2 || hobbies.length > 5) {
                setError('Please select between 2 and 5 hobbies');
                setLoading(false);
                return;
            }

            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();
            const trimmedName = name.trim();
            const trimmedLocation = location.trim();

            const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                name: trimmedName,
                email: trimmedEmail,
                hobbies: hobbies,
                location: trimmedLocation,
                createdAt: new Date().toISOString(),
            });

            router.replace('/main');
        } catch (err) {
            setError(getFriendlyError(err.code));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#0f172a]">
            {/* Background Decorative Blur Circles */}
            <View className="absolute top-[-50] right-[-50] w-[250] h-[250] rounded-full bg-sky-600/20 blur-[100px]" />
            <View className="absolute bottom-[-50] left-[-50] w-[300] h-[300] rounded-full bg-indigo-600/20 blur-[120px]" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    className="px-6 py-10"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View entering={FadeInUp.duration(1000).delay(200)} className="items-center mb-10">
                        <View className="w-16 h-16 bg-sky-500 rounded-[20px] items-center justify-center mb-4 shadow-xl shadow-sky-500/50">
                            <UserPlus color="white" size={32} />
                        </View>
                        <Text className="text-3xl font-black text-white tracking-tight">Create Account</Text>
                        <Text className="text-slate-400 mt-2 text-center">
                            Join MediSense for premium health tracking
                        </Text>
                    </Animated.View>

                    <Animated.View
                        entering={FadeInDown.duration(1000).delay(400)}
                        className="bg-white/5 border border-white/10 rounded-[40px] p-8 overflow-hidden"
                    >
                        <View className="flex-col gap-6">
                            <View>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</Text>
                                <View className="bg-white/5 border border-white/10 rounded-2xl flex-row items-center px-4">
                                    <User color="#475569" size={20} />
                                    <TextInput
                                        className="flex-1 px-3 py-4 text-white font-medium"
                                        placeholder="John Doe"
                                        placeholderTextColor="#64748b"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</Text>
                                <View className="bg-white/5 border border-white/10 rounded-2xl flex-row items-center px-4">
                                    <Mail color="#475569" size={20} />
                                    <TextInput
                                        className="flex-1 px-3 py-4 text-white font-medium"
                                        placeholder="john@example.com"
                                        placeholderTextColor="#64748b"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</Text>
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

                            <View>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Live in
                                </Text>

                                <View className="bg-white/5 border border-white/10 rounded-2xl flex-row items-center px-4">
                                    <Picker
                                        selectedValue={location}
                                        onValueChange={(itemValue) => setLocation(itemValue)}
                                        dropdownIconColor="#94a3b8"
                                        style={{ flex: 1, color: 'white' }}
                                    >
                                        <Picker.Item label="Select your location..." value="" />

                                        <Picker.Item label="Colombo 1 (Fort)" value="colombo 1" />
                                        <Picker.Item label="Colombo 2 (Slave Island)" value="colombo 2" />
                                        <Picker.Item label="Colombo 3 (Kollupitiya)" value="colombo 3" />
                                        <Picker.Item label="Colombo 4 (Bambalapitiya)" value="colombo 4" />
                                        <Picker.Item label="Colombo 5 (Havelock Town)" value="colombo 5" />
                                        <Picker.Item label="Colombo 6 (Wellawatte)" value="colombo 6" />
                                        <Picker.Item label="Colombo 7 (Cinnamon Gardens)" value="colombo 7" />
                                        <Picker.Item label="Colombo 8 (Borella)" value="colombo 8" />
                                        <Picker.Item label="Colombo 9 (Dematagoda)" value="colombo 9" />
                                        <Picker.Item label="Colombo 10 (Maradana)" value="colombo 10" />
                                        <Picker.Item label="Colombo 11 (Pettah)" value="colombo 11" />
                                        <Picker.Item label="Colombo 12" value="colombo 12" />
                                        <Picker.Item label="Colombo 13 (Kotahena)" value="colombo 13" />
                                        <Picker.Item label="Colombo 14 (Grandpass)" value="colombo 14" />
                                        <Picker.Item label="Colombo 15 (Modara)" value="colombo 15" />

                                        <Picker.Item label="Negombo" value="negombo" />
                                        <Picker.Item label="Dehiwala" value="dehiwala" />
                                        <Picker.Item label="Mount Lavinia" value="mount lavinia" />
                                        <Picker.Item label="Moratuwa" value="moratuwa" />
                                        <Picker.Item label="Panadura" value="panadura" />
                                        <Picker.Item label="Kelaniya" value="kelaniya" />
                                        <Picker.Item label="Ja-Ela" value="ja-ela" />
                                        <Picker.Item label="Wattala" value="wattala" />

                                        <Picker.Item label="Kandy" value="kandy" />
                                        <Picker.Item label="Galle" value="galle" />
                                        <Picker.Item label="Matara" value="matara" />
                                        <Picker.Item label="Kurunegala" value="kurunegala" />
                                        <Picker.Item label="Anuradhapura" value="anuradhapura" />
                                        <Picker.Item label="Jaffna" value="jaffna" />
                                    </Picker>
                                </View>
                            </View>

                            <View>
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">What do you like to do?</Text>
                                    <Text className={`text-[10px] font-bold ${hobbies.length >= 2 && hobbies.length <= 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {hobbies.length} Selected (Min 2, Max 5)
                                    </Text>
                                </View>
                                <View className="flex-row flex-wrap gap-2">
                                    {AVAILABLE_HOBBIES.map((hobby) => {
                                        const isSelected = hobbies.includes(hobby);
                                        return (
                                            <TouchableOpacity
                                                key={hobby}
                                                onPress={() => {
                                                    if (isSelected) {
                                                        setHobbies(prev => prev.filter(h => h !== hobby));
                                                    } else {
                                                        if (hobbies.length >= 5) {
                                                            setError('You can select a maximum of 5 hobbies');
                                                            return;
                                                        }
                                                        setError('');
                                                        setHobbies(prev => [...prev, hobby]);
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-full border flex-row items-center ${isSelected ? 'bg-indigo-500 border-indigo-400' : 'bg-white/5 border-white/10'}`}
                                            >
                                                {isSelected && <CheckCircle2 color="white" size={14} className="mr-1" />}
                                                <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{hobby}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {error ? (
                                <Animated.View entering={FadeInUp} className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                                    <Text className="text-rose-400 text-xs font-medium text-center">{error}</Text>
                                </Animated.View>
                            ) : null}

                            <TouchableOpacity
                                className={`rounded-2xl overflow-hidden mt-2 shadow-xl ${loading ? 'opacity-70' : ''}`}
                                onPress={handleRegister}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={['#0ea5e9', '#2563eb']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    className="py-5 items-center"
                                >
                                    <Text className="text-white font-bold text-lg">{loading ? 'Creating Account...' : 'Get Started'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <View className="flex-row justify-center mt-2">
                                <Text className="text-slate-500">Already have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/auth/login')}>
                                    <Text className="text-sky-400 font-bold">Sign In</Text>
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
