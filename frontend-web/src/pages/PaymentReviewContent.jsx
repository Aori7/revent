import { useEffect, useRef, useState } from "react";

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
  Circle,
  CircleAlert,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import RecipientPaymentHistory from "../components/RecipientPaymentHistory";

import {
  formatSGD,
  maskIdentifier,
  cleanAnswers,
  visibleQuestions,
  unansweredQuestions,
  calculatePaymentRisk,
  paymentPurposes,
  getReviewContext,
  hasSeriousReviewWarning,
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

import { reviewAction } from "../services/paymentReviewApi";

import "../css/banking-flow.css";
import "../css/payment-review/payment-review-notice.css";
import "../css/payment-review/guided-check.css";

// Common answer options
const yesNoUnsure = [
  ["yes", "Yes"],
  ["no", "No"],
  ["unsure", "Not sure"],
];

// Short, personalised questions
const questions = {
  purpose: {
    label: "What is this payment for?",
    options: paymentPurposes,
  },

  disclosed: {
    label: "Were all charges disclosed upfront?",
    options: yesNoUnsure,
  },

  newContact: {
    label: "Did they contact you from a new number?",
    options: yesNoUnsure,
  },

  unexpectedRequest: {
    label: "Was this payment request unexpected?",
    options: yesNoUnsure,
  },

  guaranteedReturns: {
    label: "Were you promised guaranteed high returns?",
    options: yesNoUnsure,
  },

  upfrontFee: {
    label: "Were you asked to pay to get a job or unlock earnings?",
    options: yesNoUnsure,
  },

  purposeKnown: {
    label: "Do you know why this payment is needed?",
    options: yesNoUnsure,
  },

  identity: {
    label: "Have you verified the recipient independently?",
    options: yesNoUnsure,
  },

  amountConfirmed: {
    label: "Have you confirmed this amount?",
    options: yesNoUnsure,
  },

  urgency: {
    label: "Are you being rushed or told to keep this payment secret?",
    options: yesNoUnsure,
  },
};

// Personalise the identity question without
// increasing the number of questions.
function getQuestionLabel(id, purpose, context = {}) {
  if (id !== "identity") {
    return questions[id].label;
  }

  if (context.firstTimeRecipient) {
    return "Have you verified this new recipient independently?";
  }

  const labels = {
    shopping:
      "Have you verified the seller independently?",

    personal:
      "Have you contacted them through a trusted number?",

    bills:
      "Have you checked with the organisation directly?",

    investment:
      "Have you verified the investment provider?",

    job:
      "Have you verified the company independently?",

    general:
      "Have you verified the recipient independently?",
  };

  return labels[purpose] || questions.identity.label;
}

export default function PaymentReviewContent({
  assessment,
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const restriction = usePaymentRestriction();

  const [draft] = useState(activeDraft);

  const context = getReviewContext(
    draft,
    assessment
  );

  const [answers, setAnswers] = useState(() =>
    cleanAnswers(
      readAnswers(draft),
      context
    )
  );

  const [questionIndex, setQuestionIndex] =
    useState(() => {
      const saved = cleanAnswers(
        readAnswers(draft),
        context
      );

      const ids = visibleQuestions(
        saved,
        context
      );

      const index = ids.findIndex(
        (id) => !saved[id]
      );

      return index >= 0 ? index : 0;
    });

  const [showSummary, setShowSummary] =
    useState(false);

  const [missing, setMissing] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] =
    useState(null);

  const [confirmCancel, setConfirmCancel] =
    useState(false);

  const [actionError, setActionError] =
    useState("");

  const [busy, setBusy] = useState(false);

  const actionPending = useRef(false);
  const savingRef = useRef(false);
  const timerRef = useRef(null);
  const cancelPending = useRef(false);

  const questionHeading = useRef(null);
  const focusNextQuestion = useRef(false);

  const visible = visibleQuestions(
    answers,
    context
  );

  const safeIndex = Math.min(
    questionIndex,
    Math.max(visible.length - 1, 0)
  );

  const questionId = visible[safeIndex];

  const currentQuestion = questions[questionId];

  const answeredCount = visible.filter(
    (id) => Boolean(answers[id])
  ).length;

  const progressPercent = visible.length
    ? (answeredCount / visible.length) * 100
    : 0;

  const purposeLabel = paymentPurposes.find(
    ([value]) => value === answers.purpose
  )?.[1];

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (focusNextQuestion.current) {
      questionHeading.current?.focus({
        preventScroll: true,
      });

      focusNextQuestion.current = false;
    }
  }, [questionId]);

  // Preserve details when intentionally editing.
  function editPaymentDetails() {
    navigate("/transfer/ecommerce", {
      state: {
        editPayment: true,
      },
    });
  }

  // Automatically advance after selecting an answer.
  function answerQuestion(id, value) {
    if (actionPending.current) return;

    let previous = answers;

    // Reset previous answers when changing category.
    if (
      id === "purpose" &&
      answers.purpose !== value
    ) {
      previous = {};
    }

    const updated = cleanAnswers(
      {
        ...previous,
        [id]: value,
      },
      context
    );

    try {
      saveAnswers(draft, updated);

      setAnswers(updated);
      setMissing([]);
      setShowSummary(false);
      setSaveMessage(null);
      setActionError("");

      const nextVisible = visibleQuestions(
        updated,
        context
      );

      const currentIndex =
        nextVisible.indexOf(id);

      if (currentIndex < nextVisible.length - 1) {
        focusNextQuestion.current = true;

        setQuestionIndex(
          currentIndex + 1
        );
      } else {
        // Automatically generate the safety summary.
        generateSummary(updated);
      }

    } catch (error) {
      setActionError(error.message);
    }
  }

  // Preserve backend safety summary integration.
  async function generateSummary(
    currentAnswers = answers
  ) {
    if (actionPending.current) return;

    const cleaned = cleanAnswers(
      currentAnswers,
      context
    );

    const unanswered = unansweredQuestions(
      cleaned,
      context
    );

    setMissing(unanswered);
    setActionError("");

    if (unanswered.length > 0) {
      setShowSummary(false);

      const ids = visibleQuestions(
        cleaned,
        context
      );

      setQuestionIndex(
        ids.indexOf(unanswered[0])
      );

      return;
    }

    actionPending.current = true;
    setBusy(true);

    try {
      if (draft.transferType === "ecommerce") {
        await reviewAction(
          "summary",
          draft,
          cleaned
        );
      }

      saveAnswers(draft, cleaned);

      setAnswers(cleaned);
      setShowSummary(true);

    } catch (error) {
      setShowSummary(false);

      setActionError(
        error.message ||
        "Unable to load your safety results."
      );

    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  }

  // Allow navigation through previously answered questions.
  function nextQuestion() {
    if (actionPending.current) return;

    if (!answers[questionId]) {
      setMissing([questionId]);
      return;
    }

    if (safeIndex < visible.length - 1) {
      focusNextQuestion.current = true;

      setQuestionIndex(safeIndex + 1);
    } else {
      generateSummary();
    }
  }

  // Preserve Sprint 1 save and resume.
  function saveForLater() {
    if (
      savingRef.current ||
      actionPending.current
    ) {
      return;
    }

    savingRef.current = true;
    actionPending.current = true;

    setBusy(true);
    setSaving(true);
    setSaveMessage(null);
    setActionError("");

    timerRef.current = setTimeout(async () => {
      try {
        // Preserve the existing save-failure test option.
        if (params.get("save") === "error") {
          throw new Error("Demo save failure");
        }

        const cleaned = cleanAnswers(
          answers,
          context
        );

        if (draft.transferType === "ecommerce") {
          await reviewAction(
            "save",
            draft,
            cleaned
          );
        }

        saveReviewForLater(
          draft.customerId,
          draft,
          cleaned
        );

        setSaveMessage({
          type: "success",
          text: "Review saved.",
        });

      } catch (error) {
        setSaveMessage({
          type: "error",
          text: "Unable to save. Try again.",
        });

        setActionError(error.message || "");

      } finally {
        savingRef.current = false;
        actionPending.current = false;

        setBusy(false);
        setSaving(false);
      }
    }, 400);
  }

  // Preserve existing payment completion checks.
  async function finishReview() {
    if (actionPending.current) return;

    actionPending.current = true;

    setBusy(true);
    setActionError("");

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
          "Review the current payment check first."
        );
      }

      const latestContext = getReviewContext(
        draft,
        current
      );

      const cleaned = cleanAnswers(
        answers,
        latestContext
      );

      const unanswered = unansweredQuestions(
        cleaned,
        latestContext
      );

      if (unanswered.length > 0) {
        setShowSummary(false);

        setMissing(unanswered);

        setQuestionIndex(
          visibleQuestions(
            cleaned,
            latestContext
          ).indexOf(unanswered[0])
        );

        throw new Error(
          "Complete all safety questions."
        );
      }

      // Preserve existing payment restrictions.
      if (restriction) {
        throw new Error(restriction);
      }

      if (draft.transferType === "ecommerce") {
        if (hasSeriousReviewWarning(cleaned)) {
          throw new Error(
            "Verify the payment before proceeding."
          );
        }

        await reviewAction(
          "ack",
          draft
        );

        await reviewAction(
          "complete",
          draft,
          cleaned
        );
      }

      completeReview(
        draft,
        cleaned
      );

      navigate("/transfer/confirmation");

    } catch (error) {
      setActionError(
        error.message ||
        "Unable to complete the review."
      );

    } finally {
      actionPending.current = false;

      setBusy(false);
    }
  }

  // Preserve existing cancellation functionality.
  async function confirmCancellation() {
    if (
      cancelPending.current ||
      actionPending.current
    ) {
      return;
    }

    cancelPending.current = true;
    actionPending.current = true;

    setBusy(true);
    setActionError("");

    try {
      if (draft.transferType === "ecommerce") {
        await reviewAction(
          "cancel",
          draft
        );
      }

      await cancelPayment(draft);

      navigate("/transfer", {
        replace: true,
        state: {
          cancelled: true,
        },
      });

    } catch (error) {
      setActionError(
        error.message ||
        "Cancellation failed. Try again."
      );

    } finally {
      cancelPending.current = false;
      actionPending.current = false;

      setBusy(false);
    }
  }

  if (!draft) {
    return (
      <Navigate
        to="/transfer"
        replace
      />
    );
  }

  const cleanedAnswers = cleanAnswers(
    answers,
    context
  );

  const riskScore =
    showSummary &&
    unansweredQuestions(
      cleanedAnswers,
      context
    ).length === 0
      ? calculatePaymentRisk(
          cleanedAnswers,
          assessment
        )
      : null;

  const seriousWarning =
    draft.transferType === "ecommerce" &&
    hasSeriousReviewWarning(cleanedAnswers);

  return (
    <main className="flow-page">
      <div className="flow-shell flow-narrow">

        {/* Back navigation */}
        <button
          type="button"
          className="flow-back flow-back-button"
          disabled={busy}
          onClick={editPaymentDetails}
        >
          <ArrowLeft size={19} />

          Edit payment details
        </button>

        {/* Existing contextual safety notice */}
        <aside
          className="payment-review-notice"
          aria-labelledby="payment-review-notice-title"
        >
          <div className="payment-review-notice__top">

            <div className="payment-review-notice__icon">
              <ShieldAlert
                size={28}
                strokeWidth={2.5}
              />
            </div>

            <div className="payment-review-notice__content">

              <span className="payment-review-notice__label">
                REVENT SECURITY ALERT
              </span>

              <h2 id="payment-review-notice-title">
                {context.firstTimeRecipient
                  ? "First-time recipient"
                  : "Check before you pay"}
              </h2>

              <p>
                Sending{" "}
                <strong>
                  {formatSGD(draft.amount)}
                </strong>{" "}
                to {draft.recipientName}.
              </p>

            </div>
          </div>

          <div className="payment-review-notice__tip">

            <ShieldCheck size={20} />

            <span>
              Verify before you pay.
            </span>

          </div>
        </aside>

        {/* Page heading */}
        <div className="flow-page-heading">
          <div>

            <span className="flow-eyebrow">
              PAYMENT SAFETY
            </span>

            <h1>Review your payment</h1>

          </div>
        </div>

        {/* Existing payment summary */}
        <section className="flow-panel flow-summary-card">

          <div className="flow-section-title">
            <h2>Payment Summary</h2>

            <span className="flow-tag">
              Read-only
            </span>
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

              <dd>
                {maskIdentifier(
                  draft.recipientNumber
                )}
              </dd>
            </div>

            <div className="flow-detail-row">
              <dt>Reference</dt>
              <dd>{draft.reference || "—"}</dd>
            </div>

          </dl>
        </section>

        {/* Preserve Sprint 2 payment history */}
        <RecipientPaymentHistory draft={draft} />

        {/* Personalised guided payment check */}
        <section
          className="flow-panel flow-questions guided-check"
          aria-labelledby="guided-check-title"
          aria-busy={busy}
        >
          <div className="flow-section-title">

            <div>
              <span className="flow-eyebrow">
                GUIDED CHECK
              </span>

              <h2 id="guided-check-title">
                Payment safety check
              </h2>
            </div>

            <ShieldCheck
              size={28}
              className="flow-red"
              aria-hidden="true"
            />

          </div>

          {!riskScore && currentQuestion && (
            <>

              {/* Progress indicator */}
              <div className="guided-check__progress-heading">

                <span>
                  {questionId === "purpose"
                    ? "Payment purpose"
                    : purposeLabel}
                </span>

                {questionId !== "purpose" && (
                  <span>
                    {safeIndex} of {visible.length - 1}
                  </span>
                )}

              </div>

              <div
                className="guided-check__progress"
                role="progressbar"
                aria-label="Safety check progress"
                aria-valuenow={answeredCount}
                aria-valuemin={0}
                aria-valuemax={visible.length}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>

              {/* Display only one question at a time */}
              <fieldset
                key={questionId}
                id={`question-${questionId}`}
                className="guided-check__question"
              >
                <legend
                  ref={questionHeading}
                  tabIndex={-1}
                >
                  {getQuestionLabel(
                    questionId,
                    answers.purpose,
                    context
                  )}
                </legend>

                <div className="guided-check__options">

                  {currentQuestion.options.map(
                    ([value, label]) => {

                      const selected =
                        answers[questionId] === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={busy}
                          aria-pressed={selected}
                          className={
                            `guided-check__option ${
                              selected
                                ? "guided-check__option--selected"
                                : ""
                            }`
                          }
                          style={{
                            width: "100%",
                            textAlign: "left",
                            fontFamily: "inherit",
                          }}
                          onClick={() =>
                            answerQuestion(
                              questionId,
                              value
                            )
                          }
                        >
                          {selected ? (
                            <CheckCircle2
                              size={20}
                              color="#b42130"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              size={20}
                              aria-hidden="true"
                            />
                          )}

                          <span>{label}</span>

                        </button>
                      );
                    }
                  )}

                </div>

                {missing.includes(questionId) && (
                  <p
                    className="flow-inline-error"
                    role="alert"
                  >
                    Select an answer.
                  </p>
                )}

              </fieldset>

              {/* Navigation for editing answers */}
              <div className="guided-check__navigation">

                <button
                  type="button"
                  className="flow-button flow-button-secondary"
                  disabled={busy || safeIndex === 0}
                  onClick={() => {
                    focusNextQuestion.current = true;

                    setQuestionIndex(
                      safeIndex - 1
                    );

                    setMissing([]);
                    setActionError("");
                  }}
                >
                  <ArrowLeft size={18} />

                  Back
                </button>

                {/* Only shown when revisiting an answer
                    or retrying the safety summary. */}
                {answers[questionId] && (
                  <button
                    type="button"
                    className="flow-button flow-button-primary"
                    disabled={busy}
                    onClick={nextQuestion}
                  >
                    {busy
                      ? "Checking..."
                      : safeIndex === visible.length - 1
                        ? "See results"
                        : "Next"}

                    <ArrowRight size={18} />
                  </button>
                )}

              </div>
            </>
          )}

          {/* Completed questionnaire */}
          {riskScore && (
            <div className="guided-check__complete">

              <CheckCircle2
                size={30}
                className="flow-credit"
              />

              <h3>Check complete</h3>

              <button
                type="button"
                className="flow-button flow-button-secondary"
                disabled={busy}
                onClick={() => {
                  setShowSummary(false);
                  setQuestionIndex(0);
                }}
              >
                Review answers
              </button>

            </div>
          )}

        </section>

        {/* Existing percentage-based safety results */}
        {riskScore && (
          <section className="flow-panel risk-results">

            <span className="flow-eyebrow">
              YOUR SAFETY RESULTS
            </span>

            <h2>Payment safety</h2>

            <div className="risk-results__score">

              <div
                className="risk-results__circle"
                style={{
                  "--risk-percent":
                    `${riskScore.percentage}%`,

                  "--risk-color":
                    riskScore.level === "High"
                      ? "#c21f2b"
                      : riskScore.level === "Moderate"
                        ? "#e59a23"
                        : "#16834a",
                }}
              >
                <div className="risk-results__circle-inner">

                  <strong>
                    {riskScore.percentage}%
                  </strong>

                  <span>Risk indicator</span>

                </div>
              </div>

              <h3>{riskScore.level} Risk</h3>

            </div>

            <div className="risk-results__factors">

              <h3>What we found</h3>

              {riskScore.factors.length > 0 ? (
                riskScore.factors.map(
                  (factor, index) => (
                    <div
                      key={`${factor.message}-${index}`}
                      className="risk-results__factor"
                    >
                      <CircleAlert size={21} />

                      <span>
                        {factor.message}
                      </span>
                    </div>
                  )
                )
              ) : (
                <p>No specific warning signs detected.</p>
              )}

            </div>

            {/* Personalised recommended action */}
            <div className="risk-results__recommendation">

              <ShieldCheck size={24} />

              <div>
                <h3>Recommended action</h3>

                <p>
                  {riskScore.recommendation}
                </p>
              </div>

            </div>

            <p className="risk-results__disclaimer">
              Demo risk indicator. Not a guarantee of safety.
            </p>

            {seriousWarning && (
              <p
                className="flow-inline-error"
                role="alert"
              >
                Verify this payment before proceeding.
              </p>
            )}

            <button
              type="button"
              className={
                "flow-button flow-button-primary " +
                "risk-results__continue"
              }
              disabled={
                busy ||
                seriousWarning ||
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

        {/* Preserve existing payment restrictions */}
        {(
          restriction ||
          assessment?.canProceedToConfirmation !== true
        ) && (
          <p
            className="flow-panel"
            role="status"
          >
            {restriction ||
              assessment?.restrictionReason ||
              "Payment cannot proceed yet."}
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

        {/* Preserve save, edit and cancellation actions */}
        <details
          className={
            "flow-panel flow-save-card " +
            "flow-review-actions"
          }
        >
          <summary className="flow-review-actions__summary">

            <span className="flow-review-actions__badge">
              <BookmarkCheck size={22} />
            </span>

            <span className="flow-review-actions__summary-copy">

              <strong>Need more time?</strong>

              <small>
                Save, edit or cancel payment.
              </small>

            </span>

            <ChevronDown
              className="flow-review-actions__chevron"
              size={20}
              aria-hidden="true"
            />

          </summary>

          <div className="flow-review-actions__body">

            {/* Save and edit */}
            <div className="flow-review-actions__buttons">

              <button
                type="button"
                className="flow-review-actions__save"
                disabled={
                  busy ||
                  saving ||
                  confirmCancel
                }
                onClick={saveForLater}
              >
                <BookmarkCheck size={19} />

                {saving
                  ? "Saving..."
                  : "Save & verify later"}
              </button>

              <button
                type="button"
                className="flow-review-actions__edit"
                disabled={
                  busy ||
                  saving ||
                  confirmCancel
                }
                onClick={editPaymentDetails}
              >
                <PencilLine size={19} />

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
                    Cancel this payment and discard its review?
                  </p>

                  <div className="flow-review-actions__confirm-buttons">

                    <button
                      type="button"
                      className="flow-review-actions__keep"
                      disabled={busy}
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
                      disabled={busy}
                      onClick={confirmCancellation}
                    >
                      Yes, cancel
                    </button>

                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="flow-review-actions__cancel"
                  disabled={busy || saving}
                  onClick={() =>
                    setConfirmCancel(true)
                  }
                >
                  <X size={17} />

                  Cancel payment
                </button>
              )}

            </div>

            {/* Save result */}
            {saveMessage && (
              <div
                className={`flow-feedback ${saveMessage.type}`}
                role="status"
              >
                {saveMessage.type === "success" ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <CircleAlert size={20} />
                )}

                <span>
                  {saveMessage.text}
                </span>
              </div>
            )}

            {saveMessage?.type === "success" && (
              <Link
                className="flow-review-actions__resume-link"
                to="/transfer"
              >
                Return to Transfer & Pay

                <ArrowRight size={17} />
              </Link>
            )}

          </div>
        </details>

      </div>
    </main>
  );
}