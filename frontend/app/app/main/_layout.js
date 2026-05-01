import { Tabs } from 'expo-router';
import { Home, Activity, Heart, MessageSquare } from 'lucide-react-native';
import { View, Platform } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#38bdf8',
                tabBarInactiveTintColor: '#64748b',
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#0f172a',
                    borderBottomWidth: 1,
                    borderBottomColor: '#1e293b',
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTitleStyle: {
                    fontWeight: '900',
                    color: '#f8fafc',
                    fontSize: 20,
                    letterSpacing: -0.5,
                },
                tabBarStyle: {
                    backgroundColor: '#0f172a',
                    borderTopWidth: 1,
                    borderTopColor: '#1e293b',
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
                },
                tabBarLabelStyle: {
                    fontWeight: '700',
                    fontSize: 12,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    headerShown: false,
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={focused ? 'bg-sky-500/10 p-2 rounded-xl' : 'p-2'}>
                            <Home size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="diabetes"
                options={{
                    headerTitle: 'Diabetes Scan',
                    tabBarLabel: 'Diabetes',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={focused ? 'bg-sky-500/10 p-2 rounded-xl' : 'p-2'}>
                            <Activity size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="hypertension"
                options={{
                    headerTitle: 'Hypertension Check',
                    tabBarLabel: 'Heart',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={focused ? 'bg-rose-500/10 p-2 rounded-xl' : 'p-2'}>
                            <Heart size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    headerTitle: 'MediSense AI',
                    tabBarLabel: 'Chat',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={focused ? 'bg-indigo-500/10 p-2 rounded-xl' : 'p-2'}>
                            <MessageSquare size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            {/* Hidden screens (not in bottom tab bar) but still part of the router layout */}
            <Tabs.Screen name="diabetes_quiz" options={{ href: null, headerTitle: 'Diet Check' }} />
            <Tabs.Screen name="diabetes_result" options={{ href: null, headerTitle: 'Result' }} />
            <Tabs.Screen name="diabetes_dashboard" options={{ href: null, headerTitle: 'Risk Dashboard' }} />
            <Tabs.Screen name="health_profile" options={{ href: null, headerTitle: 'Health Profile' }} />
            <Tabs.Screen name="hypertension_quiz" options={{ href: null, headerTitle: 'Lifestyle Check' }} />
            <Tabs.Screen name="hypertension_result" options={{ href: null, headerTitle: 'Result' }} />
        </Tabs>
    );
}
