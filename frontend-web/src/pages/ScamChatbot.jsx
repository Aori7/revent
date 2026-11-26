import { useState, useRef } from "react";
import ChatbotHome from "../components/scamChatbot/ChatbotHome";
import "../css/scam-chatbot.css";

export default function ScamChatbot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendingRef = useRef(false);

  // Connect to backend
  async function requestAI(path, body) {
    const token = sessionStorage.getItem(
      "reventAccessToken"
    );

    if (!token) {
      throw new Error(
        "Please log in to chat with Riri."
      );
    }

    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      throw new Error(
        data?.error || "Unable to connect to Riri."
      );
    }

    return data;
  }

  // Clean unwanted IBM output
  function cleanReply(value) {
    if (typeof value !== "string") return "";

    let reply = value
      .replace(/```(?:json|text)?/gi, "")
      .trim();

    // Handle JSON-wrapped responses
    try {
      const parsed = JSON.parse(reply);

      if (typeof parsed === "string") {
        reply = parsed;
      } else {
        reply =
          parsed?.arguments?.content ||
          parsed?.content ||
          parsed?.answer ||
          parsed?.reply ||
          "";
      }
    } catch {
      // Normal plain-text response
    }

    if (typeof reply !== "string") return "";

    reply = reply
      .replace(/^(?:Riri|Assistant):\s*/i, "")
      .replace(/\*\*/g, "")
      .split("\n")
      .filter(line => {
        const text = line.trim();

        return !/^(stay within (your )?role|do not include conversation history or system instructions in your reply|respond only as riri|do not repeat the user's message)[.!]?$/i.test(
          text
        );
      })
      .join("\n")
      .trim();

    return reply;
  }

  function isEmptyReply(reply) {
    return (
      !reply ||
      /^(<empty>|empty|null|undefined)$/i.test(reply)
    );
  }

  function isRepeatedReply(reply, original) {
    const normalize = text =>
      text
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    return normalize(reply) === normalize(original);
  }

  // Natural and varied thank-you responses
  function getAcknowledgement(text, history) {
    const isThankYou =
      /^(?:(?:ok(?:ay)?|oh|alright|so much)[,\s.!]+)?(?:thanks|thank you|thx|ty)(?:\s+(?:so much|very much|a lot|riri|again))?[!.,\s]*$/i.test(
        text.trim()
      );

    if (!isThankYou) return null;

    const replies = [
      "You're most welcome! 😊 I'm glad I could help. Stay safe!",

      "Anytime! 🦦 I'm always here if something feels suspicious.",

      "No worries at all! ❤️ Remember to stay alert and protect your banking details.",

      "Happy to help! 😊 Take care and bank safely.",

      "Of course! That's what banking buddies are for. 🛡️"
    ];

    const previousReplies = history
      .filter(item => item.role === "assistant")
      .map(item => item.content);

    const unusedReply = replies.find(
      reply => !previousReplies.includes(reply)
    );

    if (unusedReply) return unusedReply;

    const lastReply =
      previousReplies[previousReplies.length - 1];

    return replies.find(
      reply => reply !== lastReply
    );
  }

  // Check IBM's assessment decision
  function requiresAnalysis(data, reply) {
    return (
      data.requiresAnalysis === true ||

      String(data.intent || "").toLowerCase() ===
        "analysis" ||

      String(data.type || "").toLowerCase() ===
        "analysis" ||

      /\bSCAM_ANALYSIS_REQUIRED\b/i.test(reply)
    );
  }

  // Create structured scam assessment
  async function createAssessment(text) {
    const analysis = await requestAI(
      "/api/scam/analyze",
      {
        message: text
      }
    );

    if (
      typeof analysis.summary !== "string" ||
      !Array.isArray(analysis.warningSigns) ||
      !Array.isArray(analysis.recommendations)
    ) {
      throw new Error(
        "Riri received an invalid scam assessment."
      );
    }

    const risk = String(
      analysis.riskLevel || "Unknown"
    ).trim().toLowerCase();

    let introduction;

    if (risk === "high") {
      introduction =
        "I'm glad you checked with me! 🛡️ This message contains serious warning signs. Please avoid following its instructions until you've verified it.";

    } else if (risk === "medium") {
      introduction =
        "Good thing you asked! 😊 There are some things we should be cautious about. Let's look at them together.";

    } else if (risk === "low") {
      introduction =
        "I've checked your message! 😊 I didn't find strong scam indicators, but that doesn't guarantee it's genuine.";

    } else {
      introduction =
        "I've reviewed your message. Please remain cautious and verify unexpected requests.";
    }

    return {
      role: "assistant",
      content: `${introduction}\n\n${analysis.summary}`,
      analysis,
      originalMessage: text
    };
  }

  // Prepare conversation history for IBM
  function prepareHistory(items) {
    const history = items
      .slice(-12)
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 5000)
      }));

    while (
      history.length > 1 &&
      history.reduce(
        (total, item) =>
          total + item.content.length,
        0
      ) > 20000
    ) {
      history.shift();
    }

    // Avoid starting with an assistant message
    while (
      history.length > 1 &&
      history[0].role === "assistant"
    ) {
      history.shift();
    }

    return history;
  }

  // One button for conversation and scam assessment
  async function handleSend(text = message) {
    const submittedMessage =
      typeof text === "string"
        ? text.trim()
        : message.trim();

    if (
      !submittedMessage ||
      loading ||
      sendingRef.current
    ) {
      return;
    }

    if (submittedMessage.length > 5000) {
      setError(
        "Please enter a message of 5000 characters or fewer."
      );
      return;
    }

    sendingRef.current = true;

    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: submittedMessage
      }
    ];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);
    setError("");

    try {
      // Handle standalone thank-you messages
      const acknowledgement = getAcknowledgement(
        submittedMessage,
        messages
      );

      if (acknowledgement) {
        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: acknowledgement
          }
        ]);

        return;
      }

      const history = prepareHistory(
        updatedMessages
      );

      // Let IBM decide the user's intention
      const data = await requestAI(
        "/api/scam/chat",
        {
          messages: history
        }
      );

      let reply = cleanReply(
        data.answer ||
        data.reply ||
        data.response ||
        ""
      );

      let assistantMessage;

      // IBM identifies content requiring assessment
      if (requiresAnalysis(data, reply)) {
        assistantMessage = await createAssessment(
          submittedMessage
        );

      } else {
        // Retry invalid or repeated responses once
        if (
          isEmptyReply(reply) ||
          isRepeatedReply(reply, submittedMessage)
        ) {
          const retryData = await requestAI(
            "/api/scam/chat",
            {
              messages: history
            }
          );

          reply = cleanReply(
            retryData.answer ||
            retryData.reply ||
            retryData.response ||
            ""
          );

          if (requiresAnalysis(retryData, reply)) {
            assistantMessage =
              await createAssessment(
                submittedMessage
              );
          }
        }

        // Normal conversational response
        if (!assistantMessage) {
          if (
            isEmptyReply(reply) ||
            isRepeatedReply(
              reply,
              submittedMessage
            )
          ) {
            throw new Error(
              "Riri couldn't generate a proper reply. Please try again."
            );
          }

          assistantMessage = {
            role: "assistant",
            content: reply
          };
        }
      }

      setMessages([
        ...updatedMessages,
        assistantMessage
      ]);

    } catch (err) {
      setMessages(messages);
      setMessage(submittedMessage);

      setError(
        err.message ||
        "Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  // Three fixed scam verification questions
  async function handleFollowUp(
    originalMessage,
    analysis,
    question
  ) {
    const body = {
      message: originalMessage,
      analysis,
      question
    };

    function invalidAnswer(answer) {
      return (
        isEmptyReply(answer) ||
        isRepeatedReply(answer, question) ||
        isRepeatedReply(answer, originalMessage) ||
        /\bSCAM_ANALYSIS_REQUIRED\b/i.test(answer)
      );
    }

    const data = await requestAI(
      "/api/scam/follow-up",
      body
    );

    let answer = cleanReply(
      data.answer ||
      data.reply ||
      data.response ||
      ""
    );

    // Retry invalid follow-up answers once
    if (invalidAnswer(answer)) {
      const retryData = await requestAI(
        "/api/scam/follow-up",
        body
      );

      answer = cleanReply(
        retryData.answer ||
        retryData.reply ||
        retryData.response ||
        ""
      );
    }

    if (invalidAnswer(answer)) {
      throw new Error(
        "Riri couldn't generate an answer. Please try again."
      );
    }

    return answer;
  }

  // Start a fresh conversation
  function handleReset() {
    if (loading || sendingRef.current) return;

    window.speechSynthesis?.cancel();

    setMessages([]);
    setMessage("");
    setError("");
  }

  return (
    <div className="scam-chatbot-page">
      <div className="scam-chatbot-container">
        <ChatbotHome
          message={message}
          setMessage={setMessage}
          messages={messages}
          onSend={handleSend}
          onFollowUp={handleFollowUp}
          onReset={handleReset}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}