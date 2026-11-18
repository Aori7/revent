const supabaseAdmin = require("../config/supabaseAdmin");

// Retrieve user's points balance
async function getPointsBalance(req, res) {
    try {
        const { data, error } = await supabaseAdmin.rpc(
            "get_points_balance",
            {
                p_user_id: req.user.id
            }
        );

        if (error) throw error;

        return res.status(200).json({
            pointsBalance: Number(data)
        });

    } catch (error) {
        console.error("Points balance error:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve points balance."
        });
    }
}

// Retrieve user's points transaction history
async function getPointsHistory(req, res) {
    try {
        const { data, error } = await supabaseAdmin
            .from("points_transactions")
            .select(`
                points_transaction_id,
                points_change,
                activity_type,
                activity_description,
                created_at
            `)
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            transactions: data
        });

    } catch (error) {
        console.error("Points history error:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve points history."
        });
    }
}

// Retrieve available rewards from Supabase
async function getRewardCatalog(req, res) {
    try {
        const { data, error } = await supabaseAdmin
            .from("rewards")
            .select(`
                reward_id,
                reward_code,
                reward_name,
                merchant_name,
                description,
                terms_and_conditions,
                points_required,
                validity_days,
                max_redemptions_per_user_per_day,
                image_path
            `)
            .eq("is_active", true)
            .order("reward_id", { ascending: true });

        if (error) throw error;

        return res.status(200).json({
            rewards: data
        });

    } catch (error) {
        console.error("Rewards catalogue error:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve rewards catalogue."
        });
    }
}

// Redeem a reward using the user's available points
async function redeemReward(req, res) {
    try {
        const userId = req.user.id;
        const { rewardCode, requestId } = req.body || {};

        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (
            typeof rewardCode !== "string" ||
            !rewardCode.trim() ||
            typeof requestId !== "string" ||
            !uuidPattern.test(requestId)
        ) {
            return res.status(400).json({
                message: "Invalid redemption request."
            });
        }

        const { data, error } = await supabaseAdmin.rpc(
            "redeem_reward",
            {
                p_user_id: userId,
                p_reward_code: rewardCode,
                p_request_id: requestId
            }
        );

        if (error) {
            const knownErrors = [
                "Insufficient points",
                "Daily redemption limit reached",
                "Reward is not available",
                "Invalid duplicate request"
            ];

            if (knownErrors.includes(error.message)) {
                return res.status(409).json({
                    message: error.message
                });
            }

            throw error;
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Reward redemption error:", error.message);

        return res.status(500).json({
            message: "Unable to redeem reward. Please try again."
        });
    }
}

// Retrieve vouchers belonging to the authenticated user
async function getMyRewards(req, res) {
    try {
        const { data, error } = await supabaseAdmin
            .from("user_rewards")
            .select(`
                redemption_id,
                reward_id,
                voucher_code,
                points_spent,
                redemption_status,
                redeemed_at,
                expires_at,
                rewards (
                    reward_code,
                    reward_name,
                    description,
                    terms_and_conditions,
                    image_path
                )
            `)
            .eq("user_id", req.user.id)
            .order("redeemed_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            vouchers: data
        });

    } catch (error) {
        console.error("My rewards error:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve your rewards."
        });
    }
}

// Mark a redeemed voucher as used
async function markRewardUsed(req, res) {
    try {
        const userId = req.user.id;
        const { redemptionId } = req.body || {};

        const id = Number(redemptionId);

        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            id > 2147483647
        ) {
            return res.status(400).json({
                message: "Invalid voucher ID."
            });
        }

        const { data, error } = await supabaseAdmin.rpc(
            "mark_reward_used",
            {
                p_user_id: userId,
                p_redemption_id: id
            }
        );

        if (error) {
            if (
                error.message ===
                "Voucher is unavailable or has expired"
            ) {
                return res.status(409).json({
                    message: error.message
                });
            }

            throw error;
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Voucher usage error:", error.message);

        return res.status(500).json({
            message: "Unable to use voucher."
        });
    }
}

module.exports = {
    getPointsBalance,
    getPointsHistory,
    getRewardCatalog,
    redeemReward,
    getMyRewards,
    markRewardUsed
};