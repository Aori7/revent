
import { useEffect, useRef, useState } from "react";
import RecipientPaymentHistory from "../components/RecipientPaymentHistory";
import {
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  ChevronDown,
  PencilLine,
  X,
  CheckCircle2,
  CircleAlert,
  Info,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import {
  formatSGD,
  maskIdentifier,
  cleanAnswers,
  visibleQuestions,
  unansweredQuestions,
  generatePaymentAdvice,
  calculatePaymentRisk,
} from "../utils/banking";

import {
  activeDraft,
  cancelPayment,
  completeReview,
  readAnswers,
  saveAnswers,
  saveReviewForLater,
} from "../utils/demoSession";

import {
  getRiskAssessment,
  hasAcknowledgedAlert,
} from "../utils/riskSession";

import usePaymentRestriction from "../utils/usePaymentRestriction";

import "../css/banking-flow.css";
import "../css/payment-review-notice.css";
import "../css/guided-check.css";

const yesNo = [
  ["yes", "Yes"],
  ["no", "No"],
];

const yesNoUnsure = [...yesNo, ["unsure", "Not sure"]];

const questions = [
  {
    id: "extraFee",
    label:
      "Has the seller requested an additional fee after an earlier payment?",
    options: yesNoUnsure,
  },
  {
    id: "disclosed",
    label: "Was this fee disclosed before your earlier payment?",
    options: yesNoUnsure,
  },
  {
    id: "source",
    label: "Where did you find this seller?",
    description: "Knowing the source helps identify impersonation risks.",
    options: [
      ["retailer", "An established retailer"],
      ["marketplace", "Online marketplace"],
      ["social", "Social media / messaging app"],
      ["unknown", "I am not sure"],
    ],
  },
  {
    id: "identity",
    label: "Have you independently verified who will receive the payment?",
    description:
      "For example, using an official website or contact number you looked up yourself.",
    options: yesNoUnsure,
  },
  {
    id: "urgency",
    label:
      "Are you being pressured to pay before independently checking the request?",
    description: "Examples include threats, countdowns or urgent requests.",
    options: yesNoUnsure,
  },
  {
    id: "reviews",
    label: "Have you checked independent seller reviews or history?",
    description:
      "This question appears when extra seller verification may help.",
    options: yesNoUnsure,
  },
  {
    id: "secrecy",
    label: "Were you told to keep this payment secret?",
    description: "This question appears because you reported payment pressure.",
    options: yesNo,
  },
];

export default function PaymentReview({ assessment }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const restriction = usePaymentRestriction();

  const [draft] = useState(activeDraft);
  const [answers, setAnswers] = useState(() => readAnswers(draft));
  const [showSummary, setShowSummary] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [missing, setMissing] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState("");

  const savingRef = useRef(false);
  const timerRef = useRef(null);
  const cancelPending = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function answerQuestion(id, value) {
    const updated = cleanAnswers({
      ...answers,
      [id]: value,
    });

    setAnswers(updated);
    setMissing([]);
    setShowSummary(false);
    setSaveMessage(null);
    setActionError("");

    try {
      saveAnswers(draft, updated);
    } catch (err) {
      setActionError(err.message);
    }
  }

  function generateSummary() {
    const unanswered = unansweredQuestions(answers);

    setMissing(unanswered);
    setActionError("");

    if (unanswered.length > 0) {
      setShowSummary(false);

      document
        .getElementById(`question-${unanswered[0]}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return;
    }

    try {
      saveAnswers(draft, answers);
      setShowSummary(true);
    } catch (err) {
      setShowSummary(false);
      setActionError(err.message);
    }
  }

  function saveForLater() {
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setSaveMessage(null);

    timerRef.current = setTimeout(() => {
      try {
        // Keep the existing save-failure test option.
        if (params.get("save") === "error") {
          throw new Error("Demo save failure");
        }

        // Use the signed-in customer's ID from this draft.
        saveReviewForLater(draft.customerId, draft, answers);

        setSaveMessage({
          type: "success",
          text:
            "Review saved for this browser session. " +
            "Resume it from Transfer & Pay.",
        });
      } catch {
        setSaveMessage({
          type: "error",
          text: "We could not save your review. Please try again.",
        });
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    }, 400);
  }

  function finishReview() {
    try {
      const current = getRiskAssessment();

      if (
        current?.canProceedToConfirmation !== true ||
        (
          current.conditions?.firstTimeRecipient &&
          !hasAcknowledgedAlert(draft)
        )
      ) {
        throw new Error(
          "Review the current payment check before continuing."
        );
      }

      completeReview(draft, answers);
      navigate("/transfer/confirmation");
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function confirmCancellation() {
    if (cancelPending.current) return;

    cancelPending.current = true;
    setActionError("");

    try {
      await cancelPayment(draft);

      navigate("/transfer", {
        replace: true,
        state: { cancelled: true },
      });
    } catch {
      setActionError("Cancellation failed. Please try again.");
    } finally {
      cancelPending.current = false;
    }
  }

  if (!draft) {
    return <Navigate to="/transfer" replace />;
  }

  const reasons = Array.isArray(assessment?.reasons)
    ? assessment.reasons
    : [];

  const visibleIds = visibleQuestions(answers);

  const visible = questions.filter((question) =>
    visibleIds.includes(question.id)
  );

  const safeIndex = Math.min(
    questionIndex,
    Math.max(visible.length - 1, 0)
  );

  const currentQuestion = visible[safeIndex];

  const answeredCount = visible.filter((question) =>
    Boolean(answers[question.id])
  ).length;

  const progressPercent = visible.length
    ? (answeredCount / visible.length) * 100
    : 0;

  function nextQuestion() {
    if (!currentQuestion || !answers[currentQuestion.id]) {
      setMissing(currentQuestion ? [currentQuestion.id] : []);
      return;
    }

    setMissing([]);

    if (safeIndex < visible.length - 1) {
      setQuestionIndex(safeIndex + 1);
    } else {
      generateSummary();
    }
  }

  const advice = showSummary
    ? generatePaymentAdvice(answers)
    : null;

  const riskScore = showSummary
    ? calculatePaymentRisk(answers, assessment)
    : null;

  return (
    <main className="flow-page">
      <div className="flow-shell flow-narrow">
        {/* Back navigation */}
        <button
          type="button"
          className="flow-back flow-back-button"
          onClick={() => navigate("/transfer/ecommerce")}
        >
          <ArrowLeft size={19} />
          Edit payment details
        </button>

        {/* Risk notice */}
        <aside
          className="payment-review-notice"
          aria-labelledby="payment-review-notice-title"
        >
          <div className="payment-review-notice__top">
            <div className="payment-review-notice__icon">
              <ShieldAlert size={28} strokeWidth={2.5} />
            </div>

            <div className="payment-review-notice__content">
              <span className="payment-review-notice__label">
                REVENT SECURITY ALERT
              </span>

              <h2 id="payment-review-notice-title">
                {assessment?.conditions?.firstTimeRecipient
                  ? `You've never paid ${draft.recipientName} before.`
                  : `Let's double-check your payment to ${draft.recipientName}.`}
              </h2>

              <p>
                You're about to send{" "}
                <strong>{formatSGD(draft.amount)}</strong>.
              </p>
            </div>
          </div>

          <div className="payment-review-notice__tip">
            <ShieldCheck size={20} />

            <span>
              {assessment?.conditions?.firstTimeRecipient
                ? "Know who you're paying? Verify their identity first."
                : "Make sure you recognise this payment request."}
            </span>
          </div>
        </aside>

        {/* Page heading */}
        <div className="flow-page-heading">
          <div>
            <span className="flow-eyebrow">PAYMENT SAFETY</span>
            <h1>Review your payment</h1>
            <p>
              A few quick checks before you decide whether to proceed.
            </p>
          </div>
        </div>

        {/* Payment information */}
        <section className="flow-panel flow-summary-card">
          <div className="flow-section-title">
            <h2>Payment Summary</h2>
            <span className="flow-tag">Read-only</span>
          </div>

          <p className="flow-payment-amount">
            {formatSGD(draft.amount)}
          </p>

          <dl className="flow-detail-list">
            <div className="flow-detail-row">
              <dt>Recipient</dt>
              <dd>{draft.recipientName}</dd>
            </div>

            <div className="flow-detail-row">
              <dt>Recipient identifier</dt>
              <dd>{maskIdentifier(draft.recipientNumber)}</dd>
            </div>

            <div className="flow-detail-row">
              <dt>Reference</dt>
              <dd>{draft.reference || "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Existing recipient payment history */}
        <RecipientPaymentHistory draft={draft} />

        {/* Guided payment check */}
        <section
          className="flow-panel flow-questions guided-check"
          aria-labelledby="guided-check-title"
        >
          <div className="flow-section-title">
            <div>
              <span className="flow-eyebrow">GUIDED CHECK</span>
              <h2 id="guided-check-title">
                Let's check this payment
              </h2>
            </div>

            <ShieldCheck
              size={28}
              className="flow-red"
              aria-hidden="true"
            />
          </div>

          {!showSummary && currentQuestion && (
            <>
              {/* Progress indicator */}
              <div className="guided-check__progress-heading">
                <span>
                  Question {safeIndex + 1} of {visible.length}
                </span>

                <span>{answeredCount} answered</span>
              </div>

              <div
                className="guided-check__progress"
                role="progressbar"
                aria-label="Guided check completion"
                aria-valuenow={answeredCount}
                aria-valuemin={0}
                aria-valuemax={visible.length}
              >
                <div
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Current question */}
              <fieldset
                key={currentQuestion.id}
                id={`question-${currentQuestion.id}`}
                className="guided-check__question"
              >
                <legend>{currentQuestion.label}</legend>

                {currentQuestion.description && (
                  <p className="guided-check__hint">
                    {currentQuestion.description}
                  </p>
                )}

                <div className="guided-check__options">
                  {currentQuestion.options.map(([value, label]) => (
                    <label
                      key={value}
                      className={`guided-check__option ${
                        answers[currentQuestion.id] === value
                          ? "guided-check__option--selected"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={value}
                        checked={
                          answers[currentQuestion.id] === value
                        }
                        onChange={() =>
                          answerQuestion(currentQuestion.id, value)
                        }
                      />

                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {missing.includes(currentQuestion.id) && (
                  <p
                    className="flow-inline-error"
                    role="alert"
                  >
                    Choose an answer to continue.
                  </p>
                )}
              </fieldset>

              {/* Question navigation */}
              <div className="guided-check__navigation">
                <button
                  type="button"
                  className="flow-button flow-button-secondary"
                  disabled={safeIndex === 0}
                  onClick={() => {
                    setQuestionIndex(safeIndex - 1);
                    setMissing([]);
                  }}
                >
                  <ArrowLeft size={18} />
                  Back
                </button>

                <button
                  type="button"
                  className="flow-button flow-button-primary"
                  disabled={!answers[currentQuestion.id]}
                  onClick={nextQuestion}
                >
                  {safeIndex === visible.length - 1
                    ? "See my safety summary"
                    : "Next question"}

                  <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}

          {/* Completed questionnaire */}
          {showSummary && (
            <div className="guided-check__complete">
              <CheckCircle2
                size={30}
                className="flow-credit"
              />

              <h3>Check complete!</h3>

              <p>
                You've answered {visible.length} questions.
                Review your personalised guidance below.
              </p>

              <button
                type="button"
                className="flow-button flow-button-secondary"
                onClick={() => {
                  setShowSummary(false);
                  setQuestionIndex(0);
                }}
              >
                Review my answers
              </button>
            </div>
          )}
        </section>

        {/* Existing percentage-based risk summary */}
        {advice && riskScore && (
          <section className="flow-panel risk-results">
            <span className="flow-eyebrow">
              YOUR SAFETY RESULTS
            </span>

            <h2>Here's what we found</h2>

            <div className="risk-results__score">
              <div
                className="risk-results__circle"
                style={{
                  "--risk-percent": `${riskScore.percentage}%`,
                  "--risk-color":
                    riskScore.level === "High"
                      ? "#c21f2b"
                      : riskScore.level === "Moderate"
                        ? "#e59a23"
                        : "#16834a",
                }}
              >
                <div className="risk-results__circle-inner">
                  <strong>{riskScore.percentage}%</strong>
                  <span>Risk indicator</span>
                </div>
              </div>

              <h3>{riskScore.level} Risk</h3>

              <p>
                Based on your answers and REVENT's transaction checks.
              </p>
            </div>

            <div className="risk-results__factors">
              <h3>Why this score?</h3>

              {riskScore.factors.length > 0 ? (
                riskScore.factors.map((factor, index) => (
                  <div
                    key={`${factor.message}-${index}`}
                    className="risk-results__factor"
                  >
                    <CircleAlert size={21} />
                    <span>{factor.message}</span>
                  </div>
                ))
              ) : (
                <p>No specific warning signs were identified.</p>
              )}
            </div>

            <div className="risk-results__recommendation">
              <ShieldCheck size={24} />

              <div>
                <h3>What should you do?</h3>
                <p>{riskScore.recommendation}</p>
              </div>
            </div>

            <p className="risk-results__disclaimer">
              This score is a demo risk indicator, not the
              probability of fraud or a guarantee of safety.
            </p>

            <button
              type="button"
              className={
                "flow-button flow-button-primary " +
                "risk-results__continue"
              }
              disabled={
                Boolean(restriction) ||
                assessment?.canProceedToConfirmation !== true
              }
              onClick={finishReview}
            >
              Proceed Payment
              <ArrowRight size={20} />
            </button>
          </section>
        )}

        {/* Existing payment restrictions */}
        {(restriction ||
          assessment?.canProceedToConfirmation !== true) && (
          <p className="flow-panel" role="status">
            {restriction ||
              assessment?.restrictionReason ||
              "This payment cannot proceed yet"}
            . Confirmation is unavailable while this
            restriction is active.
          </p>
        )}

        {actionError && (
          <p
            className="flow-inline-error"
            role="alert"
          >
            {actionError}
          </p>
        )}

        {/* Redesigned secondary payment actions */}
        <details
          className={
            "flow-panel flow-save-card " +
            "flow-review-actions"
          }
        >
          <summary className="flow-review-actions__summary">
            <span
              className="flow-review-actions__badge"
              aria-hidden="true"
            >
              <BookmarkCheck size={22} />
            </span>

            <span className="flow-review-actions__summary-copy">
              <strong>Need more time?</strong>
              <small>
                Save this review or make changes to your payment.
              </small>
            </span>

            <ChevronDown
              className="flow-review-actions__chevron"
              size={20}
              aria-hidden="true"
            />
          </summary>

          <div className="flow-review-actions__body">
            {/* Save and Edit */}
            <div className="flow-review-actions__buttons">
              <button
                type="button"
                className="flow-review-actions__save"
                disabled={saving || confirmCancel}
                onClick={saveForLater}
              >
                <BookmarkCheck
                  size={19}
                  aria-hidden="true"
                />

                {saving
                  ? "Saving review..."
                  : "Save & verify later"}
              </button>

              <button
                type="button"
                className="flow-review-actions__edit"
                disabled={saving || confirmCancel}
                onClick={() =>
                  navigate("/transfer/ecommerce")
                }
              >
                <PencilLine
                  size={19}
                  aria-hidden="true"
                />
                Edit details
              </button>
            </div>

            {/* Cancellation */}
            <div className="flow-review-actions__footer">
              {confirmCancel ? (
                <div
                  className="flow-review-actions__confirm"
                  role="group"
                  aria-label="Confirm cancellation"
                >
                  <p>
                    Cancel this payment? Your unsent payment
                    and saved review will be discarded.
                  </p>

                  <div className="flow-review-actions__confirm-buttons">
                    <button
                      type="button"
                      className="flow-review-actions__keep"
                      onClick={() => {
                        setConfirmCancel(false);
                        setActionError("");
                      }}
                    >
                      Keep reviewing
                    </button>

                    <button
                      type="button"
                      className="flow-review-actions__confirm-cancel"
                      onClick={confirmCancellation}
                    >
                      Yes, cancel payment
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="flow-review-actions__cancel"
                  disabled={saving}
                  onClick={() => setConfirmCancel(true)}
                >
                  <X size={17} aria-hidden="true" />
                  Cancel payment
                </button>
              )}
            </div>

            {/* Save result */}
            {saveMessage && (
              <div
                className={
                  `flow-feedback ${saveMessage.type}`
                }
                role="status"
              >
                {saveMessage.type === "success" ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <CircleAlert size={20} />
                )}

                <span>{saveMessage.text}</span>
              </div>
            )}

            {saveMessage?.type === "success" && (
              <Link
                className="flow-review-actions__resume-link"
                to="/transfer"
              >
                Return to Transfer & Pay
                <ArrowRight
                  size={17}
                  aria-hidden="true"
                />
              </Link>
            )}
          </div>
        </details>
      </div>
    </main>
  );
}
