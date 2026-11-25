
const express = require("express");
const scamController = require("../controllers/scamController");

const router = express.Router();

// Analyse suspicious content
router.post("/analyze", scamController.analyseMessage);

// Generate follow-up answer
router.post("/follow-up", scamController.followUp);

module.exports = router;
