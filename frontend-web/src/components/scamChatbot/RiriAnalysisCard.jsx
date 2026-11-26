import { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CircleCheck,
  ChevronDown
} from "lucide-react";

import FollowUpQuestions, {
  getFollowUpQuestions
} from "./FollowUpQuestions";

export default function RiriAnalysisCard({
  analysis,
  originalMessage,
  onFollowUp
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Expand or collapse verification questions
  const [showGuidance, setShowGuidance] = useState(true);

  // Store previously generated answers
  const [savedAnswers, setSavedAnswers] = useState({});

  const risk = String(
    analysis?.riskLevel || "Unknown"
  ).trim().toLowerCase();

  const riskTitle =
    risk === "high"
      ? "Potential Scam"
      : risk === "medium"
      ? "Stay Cautious"
      : risk === "low"
      ? "Low Risk"
      : "Risk Unavailable";

  const RiskIcon =
    risk === "low" ? ShieldCheck : ShieldAlert;

  const warningSigns = Array.isArray(
    analysis?.warningSigns
  )
    ? analysis.warningSigns
    : [];

  const recommendations = Array.isArray(
    analysis?.recommendations
  )
    ? analysis.recommendations
    : [];

  // Handle follow-up questions
  async function selectQuestion(index) {
    if (loading) return;

    const questions = getFollowUpQuestions(
      originalMessage
    );

    if (!questions[index]) return;

    // Clicking an open question closes its answer
    if (selectedIndex === index && !error) {
      setSelectedIndex(null);
      setAnswer("");
      setError("");
      return;
    }

    setSelectedIndex(index);
    setAnswer("");
    setError("");

    // Reuse an answer instead of calling IBM again
    if (savedAnswers[index]) {
      setAnswer(savedAnswers[index]);
      return;
    }

    setLoading(true);

    try {
      const response = await onFollowUp(
        originalMessage,
        analysis,
        questions[index]
      );

      if (
        typeof response !== "string" ||
        !response.trim()
      ) {
        throw new Error(
          "No answer was returned."
        );
      }

      setAnswer(response);

      // Save the answer for future viewing
      setSavedAnswers(previous => ({
        ...previous,
        [index]: response
      }));

    } catch (err) {
      setError(
        err.message ||
        "Unable to generate an answer. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="riri-analysis-card">

      {/* Risk assessment */}
      <div className={`riri-risk-banner risk-${risk}`}>
        <RiskIcon size={26} />

        <div>
          <span>AI RISK ASSESSMENT</span>

          <h3>{riskTitle}</h3>

          {/* Avoid displaying Low Risk twice */}
          {(risk === "high" || risk === "medium") && (
            <small>
              {risk === "high"
                ? "High Risk"
                : "Medium Risk"}
            </small>
          )}
        </div>
      </div>

      {/* Warning signs */}
      <div className="riri-analysis-section">
        <h3>Warning signs detected</h3>

        {warningSigns.length > 0 ? (
          warningSigns.map((warning, index) => {
            const [title, ...description] =
              String(warning).split("|");

            return (
              <div
                className="riri-warning-item"
                key={index}
              >
                <AlertTriangle size={20} />

                <div>
                  <strong>{title.trim()}</strong>

                  {description.length > 0 && (
                    <p>
                      {description.join("|").trim()}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p>
            No obvious warning signs detected.
            This does not guarantee that the message is safe.
          </p>
        )}
      </div>

      {/* Safety recommendations */}
      <div className="riri-analysis-section">
        <h3>Safety recommendations</h3>

        {recommendations.length > 0 ? (
          recommendations.map((action, index) => (
            <div
              className="riri-recommendation-item"
              key={index}
            >
              <CircleCheck size={20} />
              <p>{action}</p>
            </div>
          ))
        ) : (
          <p>
            Verify unexpected requests through official
            banking channels.
          </p>
        )}
      </div>

      {/* Personalised reminder from Riri */}
      <div className="riri-personal-advice">
        <strong>
          🦦 A little reminder from Riri
        </strong>

        <p>
          {risk === "high"
            ? "Please don't respond to this message or follow any suspicious requests. If you've already shared sensitive banking information, contact your bank immediately. Your safety comes first! ❤️"

            : risk === "medium"
            ? "Let's be extra careful with this one. Verify the sender through official channels before taking any action. It's always better to check first! ❤️"

            : risk === "low"
            ? "I didn't spot any major warning signs, but remember that even ordinary-looking messages can be misleading. Stay alert and keep your banking details private! ❤️"

            : "I couldn't confidently assess this message. Please verify it independently before taking any action."}
        </p>
      </div>

      {/* Collapsible follow-up questions */}
      <div
        style={{
          marginTop: "16px"
        }}
      >
        <button
          type="button"
          onClick={() =>
            setShowGuidance(previous => !previous)
          }
          aria-expanded={showGuidance}
          style={{
            width: "100%",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#FFF9F6",
            border: "1px solid #E9C9BD",
            borderRadius: "10px",
            color: "#B51C30",
            fontFamily: "inherit",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: showGuidance ? "10px" : "0"
          }}
        >
          <span>
            {showGuidance
              ? "Hide verification questions"
              : "Need More Guidance? (3 questions)"}
          </span>

          <ChevronDown
            size={20}
            style={{
              transform: showGuidance
                ? "rotate(180deg)"
                : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }}
          />
        </button>

        {showGuidance && (
          <FollowUpQuestions
            message={originalMessage}
            selectedIndex={selectedIndex}
            onSelect={selectQuestion}
            answer={answer}
            loading={loading}
            error={error}
          />
        )}
      </div>

      {/* Disclaimer */}
      <p className="riri-analysis-disclaimer">
        AI assessment is advisory and may be inaccurate.
      </p>
    </div>
  );
}