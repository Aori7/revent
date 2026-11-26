const {
  analyseScamMessage,
  answerScamFollowUp,
  chatWithRiri
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

// Conversational Riri AI
async function chat(req, res) {
  try {
    const { messages } = req.body || {};

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 20
    ) {
      return res.status(400).json({
        error: "Invalid conversation history."
      });
    }

    const validMessages = messages.every(
      (item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim().length > 0 &&
        item.content.length <= 5000
    );

    if (
      !validMessages ||
      messages[messages.length - 1].role !== "user"
    ) {
      return res.status(400).json({
        error: "Invalid chat message."
      });
    }

    const totalLength = messages.reduce(
      (total, item) => total + item.content.length,
      0
    );

    if (totalLength > 20000) {
      return res.status(400).json({
        error: "Conversation context is too long."
      });
    }

    const answer = await chatWithRiri(messages);

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Riri chat failed:", error.message);

    return res.status(500).json({
      error: "Riri is temporarily unavailable. Please try again."
    });
  }
}

module.exports = {
  analyseMessage,
  followUp,
  chat
};