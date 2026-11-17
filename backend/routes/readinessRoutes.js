const express = require("express");
const router = express.Router();

const {
    getQuestions,
    submitQuiz,
    getAwarenessLevels
} = require("../controllers/readinessController");

const {
    requireAuth
} = require("../middlewares/authMiddleware");

router.get("/questions", requireAuth, getQuestions);
router.post("/submit", requireAuth, submitQuiz);
router.get("/awareness", requireAuth, getAwarenessLevels);

module.exports = router;