const express = require("express");
const router = express.Router();

const {
    getPointsBalance,
    getPointsHistory,
    getRewardCatalog,
    redeemReward,
    getMyRewards,
    markRewardUsed
} = require("../controllers/rewardsController");

const {
    requireAuth
} = require("../middlewares/authMiddleware");

router.get("/balance", requireAuth, getPointsBalance);
router.get("/history", requireAuth, getPointsHistory);
router.get("/catalog", requireAuth, getRewardCatalog);
router.post("/redeem", requireAuth, redeemReward);
router.get("/mine", requireAuth, getMyRewards);
router.post("/use", requireAuth, markRewardUsed);

module.exports = router;