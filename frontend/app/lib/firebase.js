import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getReactNativePersistence, browserSessionPersistence, initializeAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBlb7mlNKh32ygYSIFxzfrVZPSmOx71EiU",
  authDomain: "rp022-3ae8d.firebaseapp.com",
  projectId: "rp022-3ae8d",
  storageBucket: "rp022-3ae8d.firebasestorage.app",
  messagingSenderId: "976886998913",
  appId: "1:976886998913:web:0b5045eff2e14abc562a80"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
    persistence: Platform.OS === 'web' 
        ? browserSessionPersistence 
        : getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { auth, db };
