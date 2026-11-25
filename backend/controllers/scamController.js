
const {
  analyseScamMessage,
  answerScamFollowUp
} = require("../services/ibmService");

// Analyse suspicious content
async function analyseMessage(req, res) {
  try {
    const { message } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 5000
    ) {
      return res.status(400).json({
        error: "Please enter a message of 1 to 5000 characters."
      });
    }

    const analysis = await analyseScamMessage(
      message.trim()
    );

    res.status(200).json(analysis);

  } catch (error) {
    console.error("Scam analysis failed:", error.message);

    res.status(500).json({
      error: "Unable to analyse the message. Please try again."
    });
  }
}

// Generate AI follow-up answer
async function followUp(req, res) {
  try {
    const { message, analysis, question } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 5000 ||
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 500 ||
      !analysis ||
      typeof analysis !== "object" ||
      Array.isArray(analysis)
    ) {
      return res.status(400).json({
        error: "Invalid follow-up request."
      });
    }

    const answer = await answerScamFollowUp(
      message.trim(),
      analysis,
      question.trim()
    );

    res.status(200).json({ answer });

  } catch (error) {
    console.error("Follow-up failed:", error.message);

    res.status(500).json({
      error: "Unable to generate an answer. Please try again."
    });
  }
}

module.exports = {
  analyseMessage,
  followUp
};
