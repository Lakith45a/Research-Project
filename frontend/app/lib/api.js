export const API_CONFIG = {
    //BASE_URL: 'https://eight-toys-exist.loca.lt',
    BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000',

    // API Endpoints
    ENDPOINTS: {
        CHAT: '/chat',
        DIABETES_CHECK: '/check_diabetes',
        HYPERTENSION_CHECK: '/check_hypertension'
    }
};

// Helper function to get full URL
export const getApiUrl = (endpoint) => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
};