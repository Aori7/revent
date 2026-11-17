const express = require("express");
const router = express.Router();

const {
    getLearningProgress,
    setBookmark,
    completeCard
} = require("../controllers/learningController");

const {
    requireAuth
} = require("../middlewares/authMiddleware");

router.get("/progress", requireAuth, getLearningProgress);

router.put("/bookmark", requireAuth, setBookmark);

router.post("/complete", requireAuth, completeCard);

module.exports = router;