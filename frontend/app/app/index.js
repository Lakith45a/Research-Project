import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const router = useRouter();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setInitialized(true);
            if (user) {
                router.replace('/main');
            } else {
                router.replace('/auth/login');
            }
        });

        return unsubscribe;
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#38bdf8" />
        </View>
    );
}
