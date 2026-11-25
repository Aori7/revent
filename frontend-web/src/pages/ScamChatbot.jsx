
import { useState } from "react";

import ChatbotHome from "../components/scamChatbot/ChatbotHome";
import AnalysisResults from "../components/scamChatbot/AnalysisResults";

import FollowUpQuestions, {
  getFollowUpQuestions
} from "../components/scamChatbot/FollowUpQuestions";

import "../css/scam-chatbot.css";

export default function ScamChatbot() {
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysedMessage, setAnalysedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedIndex, setSelectedIndex] = useState(null);
  const [answer, setAnswer] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState("");

  // Send requests to Express backend
  async function requestAI(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The AI request failed.");
    }

    return data;
  }

  // Analyse suspicious content
  async function handleAnalyse() {
    const submittedMessage = message.trim();

    if (!submittedMessage || loading) return;

    setLoading(true);
    setError("");
    setAnalysis(null);
    setSelectedIndex(null);
    setAnswer("");
    setFollowUpError("");

    try {
      const data = await requestAI(
        "/api/scam/analyze",
        {
          message: submittedMessage
        }
      );

      setAnalysedMessage(submittedMessage);
      setAnalysis(data);

    } catch (err) {
      setError(
        err.message || "Unable to connect to IBM AI."
      );

    } finally {
      setLoading(false);
    }
  }

  // Generate follow-up answers
  async function handleFollowUp(index) {
    if (!analysis || followUpLoading) return;

    const questions = getFollowUpQuestions(analysedMessage);
    const selectedQuestion = questions[index];

    if (!selectedQuestion) return;

    setSelectedIndex(index);
    setAnswer("");
    setFollowUpError("");
    setFollowUpLoading(true);

    try {
      const data = await requestAI(
        "/api/scam/follow-up",
        {
          message: analysedMessage,
          analysis,
          question: selectedQuestion
        }
      );

      setAnswer(data.answer);

    } catch (err) {
      setFollowUpError(
        err.message || "Unable to generate a follow-up answer."
      );

    } finally {
      setFollowUpLoading(false);
    }
  }

  // Reset chatbot
  function handleReset() {
    setMessage("");
    setAnalysedMessage("");
    setAnalysis(null);
    setLoading(false);
    setError("");
    setSelectedIndex(null);
    setAnswer("");
    setFollowUpLoading(false);
    setFollowUpError("");
  }

  return (
    <div className="scam-chatbot-page">
      <div className="scam-chatbot-container">
        {!analysis ? (
          <ChatbotHome
            message={message}
            setMessage={setMessage}
            onAnalyse={handleAnalyse}
            loading={loading}
            error={error}
          />
        ) : (
          <>
            <AnalysisResults
              analysis={analysis}
              message={analysedMessage}
            >
              <FollowUpQuestions
                message={analysedMessage}
                selectedIndex={selectedIndex}
                onSelect={handleFollowUp}
                answer={answer}
                loading={followUpLoading}
                error={followUpError}
              />
            </AnalysisResults>

            <div className="scam-reset-row">
              <button
                type="button"
                className="scam-primary-button"
                onClick={handleReset}
                disabled={followUpLoading}
              >
                Check Another Message
              </button>
            </div>

            <p className="scam-results-disclaimer">
              AI analysis is advisory and may be inaccurate.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
