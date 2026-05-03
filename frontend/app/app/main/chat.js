import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../lib/firebase';
import { getApiUrl, API_CONFIG } from '../../lib/api';
import { Send, Bot, User, Trash2 } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import * as Linking from 'expo-linking';

export default function ChatScreen() {
    const [messages, setMessages] = useState([
        {
            id: '1',
            text: "Hello! I'm MediSense AI. I'm here to listen and help you assess your symptoms. How are you feeling today?",
            isUser: false,
        }
    ]);
    const [sessionId, setSessionId] = useState(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const userMarkdownStyles = {
        text: { color: 'white', fontSize: 16, lineHeight: 24, fontWeight: '500' },
        link: { color: '#60a5fa', textDecorationLine: 'underline' },
    };

    const aiMarkdownStyles = {
        text: { color: '#e2e8f0', fontSize: 16, lineHeight: 24, fontWeight: '500' },
        link: { color: '#60a5fa', textDecorationLine: 'underline' },
    };

    const errorMarkdownStyles = {
        text: { color: '#f87171', fontSize: 16, lineHeight: 24, fontWeight: '500' },
        link: { color: '#60a5fa', textDecorationLine: 'underline' },
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Load Messages history
                const storedHistory = await AsyncStorage.getItem('@chat_history');
                if (storedHistory) {
                    const parsed = JSON.parse(storedHistory);
                    if (parsed && parsed.length > 0) setMessages(parsed);
                }

                // Always generate a NEW Session ID when app opens/loads
                // Format: user_id + timestamp
                const uId = auth.currentUser?.uid || 'guest';
                const newSessionId = `${uId}_${Date.now()}`;
                setSessionId(newSessionId);
                console.log('--- New Chat Session Started ---');
                console.log('Session ID:', newSessionId);

            } catch (e) {
                console.error('Failed to load chat data', e);
            } finally {
                setIsLoaded(true);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (isLoaded) {
            AsyncStorage.setItem('@chat_history', JSON.stringify(messages)).catch(e => console.error(e));
        }
    }, [messages, isLoaded]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        return () => {
            keyboardDidShowListener.remove();
        };
    }, []);

    const handleNewChat = async () => {
        const uId = auth.currentUser?.uid || 'guest';
        const newId = `${uId}_${Date.now()}`;
        try {
            setSessionId(newId);
            console.log('--- Manual Session Reset ---');
            console.log('New Session ID:', newId);
            const defaultMessage = [{
                id: Date.now().toString(),
                text: "New conversation started! How can I help you today?",
                isUser: false,
            }];
            setMessages(defaultMessage);
        } catch (e) {
            console.error('Failed to reset session', e);
        }
    };

    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        const userMessage = { id: Date.now().toString(), text: trimmedInput, isUser: true };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const chatPayload = {
                session_id: sessionId,
                query: trimmedInput,
                user_id: auth.currentUser?.uid || 'guest_user'
            };

            console.log('--- Chat API Request ---');
            console.log('Payload:', JSON.stringify(chatPayload, null, 2));

            const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.CHAT), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatPayload),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            console.log('--- Chat API Response ---');
            console.log('Data:', JSON.stringify(data, null, 2));

            const aiText = data.response || "I'm sorry, I couldn't process that.";
            const aiMessage = { id: (Date.now() + 1).toString(), text: aiText, isUser: false };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error('Chat API Error:', error);
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                text: "I'm having a little trouble connecting right now. Please check your connection and try sending your message again.",
                isUser: false,
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#0f172a]">
            {/* Header controls for history */}
            <View className="flex-row justify-end px-4 py-2 border-b border-white/5">
                <TouchableOpacity onPress={handleNewChat} className="flex-row items-center bg-sky-500/10 px-3 py-1.5 rounded-full border border-sky-500/20">
                    <Trash2 color="#38bdf8" size={14} />
                    <Text className="text-sky-400 text-xs font-bold ml-1">New Chat</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 60}
            >
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1 px-4 pt-4"
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-col gap-4 pb-4">
                        {messages.map((msg, index) => (
                            <Animated.View
                                key={msg.id}
                                entering={FadeInUp.duration(400)}
                                className={`flex-row ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                {!msg.isUser && (
                                    <View className="w-8 h-8 rounded-full bg-indigo-500/20 items-center justify-center mr-2 mt-auto">
                                        <Bot color="#818cf8" size={16} />
                                    </View>
                                )}
                                <View
                                    className={`max-w-[80%] rounded-2xl p-4 ${msg.isUser
                                        ? 'bg-sky-500 rounded-br-sm'
                                        : msg.isError
                                            ? 'bg-rose-500/10 border border-rose-500/20 rounded-bl-sm'
                                            : 'bg-white/10 border border-white/5 rounded-bl-sm'
                                        }`}
                                >
                                    <Markdown
                                        style={msg.isUser ? userMarkdownStyles : msg.isError ? errorMarkdownStyles : aiMarkdownStyles}
                                        onLinkPress={(url) => Linking.openURL(url)}
                                    >
                                        {msg.text}
                                    </Markdown>
                                </View>
                                {msg.isUser && (
                                    <View className="w-8 h-8 rounded-full bg-sky-500/20 items-center justify-center ml-2 mt-auto">
                                        <User color="#38bdf8" size={16} />
                                    </View>
                                )}
                            </Animated.View>
                        ))}
                        {loading && (
                            <Animated.View entering={FadeInUp.duration(400)} className="flex-row justify-start">
                                <View className="w-8 h-8 rounded-full bg-indigo-500/20 items-center justify-center mr-2 mt-auto">
                                    <Bot color="#818cf8" size={16} />
                                </View>
                                <View className="bg-white/10 border border-white/5 rounded-2xl rounded-bl-sm p-4 items-center justify-center">
                                    <ActivityIndicator color="#818cf8" size="small" />
                                </View>
                            </Animated.View>
                        )}
                        <View className="h-4" />
                    </View>
                </ScrollView>

                {/* Input Area */}
                <View className="px-4 py-4 bg-[#0f172a] border-t border-white/10">
                    <View className="flex-row items-end bg-white/5 border border-white/10 rounded-3xl pb-1 pr-1">
                        <TextInput
                            className="flex-1 text-white text-base px-5 py-4 max-h-32"
                            placeholder="Type how you're feeling..."
                            placeholderTextColor="#64748b"
                            multiline
                            value={input}
                            onChangeText={setInput}
                        />
                        <TouchableOpacity
                            className={`w-12 h-12 rounded-full items-center justify-center mb-1 mr-1 ${input.trim() ? 'bg-sky-500' : 'bg-white/10'
                                }`}
                            onPress={handleSend}
                            disabled={!input.trim() || loading}
                        >
                            <Send color={input.trim() ? "#fff" : "#64748b"} size={20} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
