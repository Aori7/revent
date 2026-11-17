const supabaseAdmin = require("../config/supabaseAdmin");

const QUESTION_CODES = [
    "FAMILY_01", "FAMILY_02", "FAMILY_03",
    "BANK_01", "BANK_02", "BANK_03",
    "BOSS_01", "BOSS_02", "BOSS_03"
];

// Retrieve quiz questions without exposing correct answers
async function getQuestions(req, res) {
    try {
        const { data, error } = await supabaseAdmin
            .from("readiness_questions")
            .select(`
                question_id,
                question_text,
                sort_order,
                scam_types (
                    type_code
                ),
                readiness_options (
                    option_id,
                    option_text,
                    sort_order
                )
            `)
            .eq("is_active", true)
            .in("question_code", QUESTION_CODES)
            .order("sort_order", { ascending: true });

        if (error) throw error;

        const questions = data.map(question => ({
            id: question.question_id,
            category: question.scam_types.type_code,
            text: question.question_text,
            options: question.readiness_options
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(option => ({
                    id: option.option_id,
                    text: option.option_text
                }))
        }));

        if (
            questions.length !== QUESTION_CODES.length ||
            questions.some(q => q.options.length !== 4)
        ) {
            throw new Error("Incomplete quiz configuration");
        }

        return res.status(200).json({ questions });

    } catch (error) {
        console.error("Failed to retrieve quiz:", error.message);

        return res.status(500).json({
            message: "Unable to load quiz questions."
        });
    }
}

async function submitQuiz(req, res) {
    try {
        const userId = req.user.id;
        const { answers } = req.body || {};

        // Validate submitted answers
        if (!Array.isArray(answers) || answers.length !== 9) {
            return res.status(400).json({
                message: "Please answer all nine questions."
            });
        }

        const validAnswers = answers.every(answer =>
            answer &&
            Number.isInteger(answer.question_id) &&
            Number.isInteger(answer.option_id) &&
            answer.question_id > 0 &&
            answer.option_id > 0 &&
            answer.question_id <= 2147483647 &&
            answer.option_id <= 2147483647
        );

        if (!validAnswers) {
            return res.status(400).json({
                message: "Invalid answer format."
            });
        }

        // Prevent duplicate answers
        const questionIds = answers.map(a => a.question_id);

        if (new Set(questionIds).size !== 9) {
            return res.status(400).json({
                message: "Duplicate question answers detected."
            });
        }

        // Grade and save quiz through Supabase
        const { data, error } = await supabaseAdmin.rpc(
            "submit_readiness_quiz",
            {
                p_user_id: userId,
                p_answers: answers
            }
        );

        if (error) {
            if (error.message === "Invalid quiz answers") {
                return res.status(400).json({
                    message: "Invalid quiz answers."
                });
            }

            throw error;
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Quiz submission failed:", error.message);

        return res.status(500).json({
            message: "Unable to submit quiz. Please try again."
        });
    }
}

async function getAwarenessLevels(req, res) {
    try {
        const userId = req.user.id;

        const { data, error } = await supabaseAdmin
            .from("awareness_levels")
            .select(`
                awareness_level,
                score_percentage,
                consecutive_weak_results,
                last_attempt_id,
                updated_at,
                scam_types (
                    type_code,
                    type_name
                )
            `)
            .eq("user_id", userId);

        if (error) throw error;

        const levels = data
            .filter(item =>
                ["FAMILY", "BANK", "BOSS"].includes(
                    item.scam_types.type_code
                )
            )
            .map(item => ({
                category: item.scam_types.type_code,
                title: item.scam_types.type_name,
                level: item.awareness_level,
                percentage: Number(item.score_percentage),
                consecutiveWeakResults:
                    item.consecutive_weak_results,
                lastAttemptId: item.last_attempt_id,
                updatedAt: item.updated_at
            }));

        return res.status(200).json({
            hasCompletedQuiz: levels.length === 3,
            levels
        });

    } catch (error) {
        console.error(
            "Failed to retrieve awareness levels:",
            error.message
        );

        return res.status(500).json({
            message: "Unable to retrieve awareness levels."
        });
    }
}

module.exports = {
    getQuestions,
    submitQuiz,
    getAwarenessLevels
};