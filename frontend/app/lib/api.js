export const API_CONFIG = {

    
    BASE_URL: 'https://eight-toys-exist.loca.lt',

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