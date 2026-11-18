const API_BASE_URL = 'http://localhost:3000/api';
import { rewardCatalog as displayMetadata } from '../data/rewardsData';

async function request(path, options = {}) {
    const accessToken = sessionStorage.getItem(
        'reventAccessToken'
    );

    if (!accessToken) {
        throw new Error('Please log in first.');
    }

    const response = await fetch(
        `${API_BASE_URL}/rewards${path}`,
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

// Retrieve user's available points
export function getPointsBalance() {
    return request('/balance');
}

// Retrieve user's points transaction history
export function getPointsHistory() {
    return request('/history');
}

// Retrieve available rewards
export async function getRewardCatalog() {
    const data = await request('/catalog');

    return {
        rewards: data.rewards.map(item => {
            const metadata = displayMetadata.find(
                reward => reward.id === item.reward_code
            );

            return {
                id: item.reward_code,
                databaseId: item.reward_id,
                title: item.reward_name,
                cost: item.points_required,
                category: metadata?.category || 'Other',
                icon: metadata?.icon || 'gift',
                subtitle: item.description,
                details: [
                    `Valid for ${item.validity_days} days from redemption`,
                    `Maximum ${item.max_redemptions_per_user_per_day} redemption(s) per day`,
                    'Prototype voucher for demonstration only'
                ],
                terms: item.terms_and_conditions,
                imagePath: item.image_path,
                validityDays: item.validity_days,
                dailyLimit: item.max_redemptions_per_user_per_day
            };
        })
    };
}

// Redeem a reward
export function redeemReward(rewardCode, requestId) {
    return request('/redeem', {
        method: 'POST',
        body: JSON.stringify({
            rewardCode,
            requestId
        })
    });
}

// Retrieve personally redeemed vouchers
export async function getMyRewards() {
    const data = await request('/mine');

    return {
        vouchers: data.vouchers.map(item => ({
            id: String(item.redemption_id),
            catalogId: item.rewards.reward_code,
            title: item.rewards.reward_name,
            description: item.rewards.description,
            terms: item.rewards.terms_and_conditions,
            imagePath: item.rewards.image_path,
            status: item.redemption_status.toLowerCase(),
            redeemedAt: item.redeemed_at,
            expiresAt: item.expires_at,
            pointsSpent: item.points_spent,
            code: item.voucher_code
        }))
    };
}

// Mark a redeemed voucher as used
export function markRewardUsed(redemptionId) {
    return request('/use', {
        method: 'POST',
        body: JSON.stringify({
            redemptionId
        })
    });
}