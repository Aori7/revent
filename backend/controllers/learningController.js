const supabaseAdmin = require("../config/supabaseAdmin");

const TOPIC_IDS = [
    "fake-bank-officer",
    "family-impersonation",
    "deepfake",
    "fake-boss",
    "ecommerce-scam",
    "job-scam",
    "investment-scam"
];

const LEARNING_STAGES = [
    "Beginner",
    "Developing",
    "Confident"
];

// Retrieve personalised learning progress
async function getLearningProgress(req, res) {
    try {
        const userId = req.user.id;

        const { data, error } = await supabaseAdmin
            .from("learning_progress")
            .select(`
                saved_at,
                started_at,
                completed_at,
                learning_cards (
                    card_code,
                    difficulty,
                    is_active
                )
            `)
            .eq("user_id", userId);

        if (error) throw error;

        const savedIds = [];
        const completedStages = {};

        for (const item of data) {
            const card = item.learning_cards;

            if (!card || !card.is_active) continue;

            const [topicId, stage] = card.card_code.split(":");

            if (!TOPIC_IDS.includes(topicId)) continue;

            const formattedStage = LEARNING_STAGES.find(
                value => value.toUpperCase() === stage
            );

            if (!formattedStage) continue;

            // Retrieve bookmarks
            if (item.saved_at && stage === "BEGINNER") {
                savedIds.push(topicId);
            }

            // Retrieve completed stages
            if (item.completed_at) {
                if (!completedStages[topicId]) {
                    completedStages[topicId] = [];
                }

                completedStages[topicId].push(formattedStage);
            }
        }

        // Identify fully completed learning series
        const completedIds = Object.keys(completedStages).filter(
            topicId => LEARNING_STAGES.every(
                stage => completedStages[topicId].includes(stage)
            )
        );

        return res.status(200).json({
            savedIds,
            completedIds,
            completedStages
        });

    } catch (error) {
        console.error("Learning progress error:", error.message);

        return res.status(500).json({
            message: "Unable to retrieve learning progress."
        });
    }
}

// Save or remove a bookmark
async function setBookmark(req, res) {
    try {
        const userId = req.user.id;
        const { topicId, saved } = req.body || {};

        if (
            !TOPIC_IDS.includes(topicId) ||
            typeof saved !== "boolean"
        ) {
            return res.status(400).json({
                message: "Invalid bookmark request."
            });
        }

        const { data, error } = await supabaseAdmin.rpc(
            "set_learning_bookmark",
            {
                p_user_id: userId,
                p_topic_id: topicId,
                p_saved: saved
            }
        );

        if (error) throw error;

        return res.status(200).json(data);

    } catch (error) {
        console.error("Bookmark error:", error.message);

        return res.status(500).json({
            message: "Unable to update bookmark."
        });
    }
}

// Complete an individual learning card
async function completeCard(req, res) {
    try {
        const userId = req.user.id;
        const { topicId, stage } = req.body || {};

        if (
            !TOPIC_IDS.includes(topicId) ||
            !LEARNING_STAGES.includes(stage)
        ) {
            return res.status(400).json({
                message: "Invalid learning card."
            });
        }

        const { data, error } = await supabaseAdmin.rpc(
            "complete_learning_card",
            {
                p_user_id: userId,
                p_topic_id: topicId,
                p_stage: stage
            }
        );

        if (error) {
            if (
                error.message === "Complete the Beginner card first" ||
                error.message === "Complete the Developing card first"
            ) {
                return res.status(409).json({
                    message: error.message
                });
            }

            throw error;
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Card completion error:", error.message);

        return res.status(500).json({
            message: "Unable to complete learning card."
        });
    }
}

module.exports = {
    getLearningProgress,
    setBookmark,
    completeCard
};