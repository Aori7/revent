const API_BASE_URL = 'http://localhost:3000/api';

async function request(path, options = {}) {
    const accessToken = sessionStorage.getItem(
        'reventAccessToken'
    );

    if (!accessToken) {
        throw new Error('Please log in first.');
    }

    const response = await fetch(
        `${API_BASE_URL}/readiness${path}`,
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
            'Your session is invalid or has expired. Please log in again.'
        );
    }

    if (!response.ok) {
        throw new Error(
            data?.message || 'Something went wrong. Please try again.'
        );
    }

    return data;
}

// Retrieve quiz questions
export function getReadinessQuestions() {
    return request('/questions');
}

// Submit selected answers
export function submitReadinessQuiz(answers) {
    return request('/submit', {
        method: 'POST',
        body: JSON.stringify({ answers })
    });
}

// Retrieve personalised awareness levels
export function getAwarenessLevels() {
    return request('/awareness');
}