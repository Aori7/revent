const API_BASE_URL = '/api';

async function request(path, options = {}) {
    const accessToken = sessionStorage.getItem(
        'reventAccessToken'
    );

    if (!accessToken) {
        throw new Error('Please log in first.');
    }

    const response = await fetch(
        `${API_BASE_URL}/learning${path}`,
        {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    const data = await response.json().catch(() => null);

    if (response.status === 401) {
        throw new Error(
            'Your session has expired. Please log in again.'
        );
    }

    if (!response.ok) {
        throw new Error(
            data?.message || 'Something went wrong. Please try again.'
        );
    }

    return data;
}

// Retrieve personal learning progress
export function getLearningProgress() {
    return request('/progress');
}

// Save or remove a bookmark
export function setLearningBookmark(topicId, saved) {
    return request('/bookmark', {
        method: 'PUT',
        body: JSON.stringify({ topicId, saved })
    });
}

// Complete an individual learning card
export function completeLearningCard(topicId, stage) {
    return request('/complete', {
        method: 'POST',
        body: JSON.stringify({ topicId, stage })
    });
}