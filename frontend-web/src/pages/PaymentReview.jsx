import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { ShieldAlert } from "lucide-react";

import PaymentReviewContent from "./PaymentReviewContent";
import PaymentConfirmation from "./PaymentConfirmation";

import RecipientPaymentHistory from "../components/RecipientPaymentHistory";

import useTransactionRisk from "../hooks/useTransactionRisk";

import {
  activeDraft,
  canConfirm,
} from "../utils/demoSession";

import {
  formatSGD,
  maskIdentifier,
} from "../utils/banking";

import {
  acknowledgeAlert,
  clearRiskAssessment,
  getRiskAssessment,
  hasAcknowledgedAlert,
  paymentKey,
  saveRiskAssessment,
} from "../utils/riskSession";

import usePaymentRestriction from "../utils/usePaymentRestriction";

import {
  reviewAction,
  assessLivePayment,
} from "../services/paymentReviewApi";

import "../css/banking-flow.css";
import "../css/payment-review-popup.css";


// ======================================================
// PAYMENT REVIEW AND CONTEXTUAL POPUP
// Sprint 1: Guided payment review
// Sprint 2: Backend-driven first-time recipient alert
// ======================================================

export default function PaymentReview() {
  const navigate = useNavigate();

  const [needsHelp] = useState(false);

  const { assess } = useTransactionRisk();

  const restriction = usePaymentRestriction();

  const draft = activeDraft();
  const key = paymentKey(draft);

  const dialogRef = useRef(null);
  const contentRef = useRef(null);

  const contextRef = useRef({
    key: "",
    value: {},
  });

  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null);

  const [acknowledged, setAcknowledged] = useState("");

  const [actionError, setActionError] = useState("");

  const ackPending = useRef(false);

  const [ackBusy, setAckBusy] = useState(false);

  // Preserve existing transaction update listeners.
  useEffect(() => {
    const refresh = () =>
      setRetry((value) => value + 1);

    window.addEventListener(
      "revent-transactions-updated",
      refresh
    );

    window.addEventListener(
      "storage",
      refresh
    );

    return () => {
      window.removeEventListener(
        "revent-transactions-updated",
        refresh
      );

      window.removeEventListener(
        "storage",
        refresh
      );
    };
  }, []);

  // PBI-34: Retrieve trusted backend risk assessment.
  useEffect(() => {
    let cancelled = false;

    const current = activeDraft();

    if (!current) return;

    if (contextRef.current.key !== key) {
      contextRef.current = {
        key,
        value:
          getRiskAssessment()?.recipientContext || {},
      };
    }

    clearRiskAssessment();

    Promise.resolve()
      .then(() =>
        assessLivePayment(
          current,
          assess,
          contextRef.current.value
        )
      )
      .then((assessment) => {
        if (
          cancelled ||
          paymentKey(activeDraft()) !== key
        ) {
          return;
        }

        // Restore previously acknowledged server reviews.
        if (
          current.transferType === "ecommerce" &&
          assessment.serverAcknowledged === true
        ) {
          acknowledgeAlert(current);
        }

        saveRiskAssessment(current, assessment);

        setResult({
          key,
          assess,
          retry,
          restriction,
          assessment,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            key,
            assess,
            retry,
            restriction,
            error: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, assess, retry, restriction]);

  const currentResult =
    result?.key === key &&
    result?.assess === assess &&
    result?.retry === retry &&
    result?.restriction === restriction
      ? result
      : null;

  const assessment = currentResult?.assessment;

  const firstTimeRecipient =
    assessment?.conditions?.firstTimeRecipient === true;

  // Avoid repeating acknowledged alerts
  // for an unchanged payment.
  const showAlert =
    (
      firstTimeRecipient ||
      assessment?.requiresReview === true
    ) &&
    (
      draft?.transferType === "ecommerce" &&
      assessment?.serverAcknowledged === false
        ? acknowledged !== key
        : acknowledged !== key &&
          !hasAcknowledgedAlert(draft)
    );

  useLayoutEffect(() => {
    const dialog = dialogRef.current;

    if (showAlert && dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, [showAlert, currentResult]);

  if (!draft) {
    return <Navigate to="/transfer" replace />;
  }

  // Retain details only when intentionally editing.
  function goBack() {
    navigate("/transfer/ecommerce", {
      state: { editPayment: true },
    });
  }

  // Acknowledge the contextual safety alert.
  async function openReview() {
    if (ackPending.current) return;

    ackPending.current = true;
    setAckBusy(true);

    try {
      // Preserve Sprint 1 acknowledgement persistence.
      if (draft.transferType === "ecommerce") {
        await reviewAction("ack", draft);

        if (paymentKey(activeDraft()) !== key) {
          throw new Error(
            "Payment details have changed."
          );
        }
      }

      acknowledgeAlert(draft);

      setAcknowledged(key);
      setActionError("");

      dialogRef.current?.close();

      const heading =
        contentRef.current?.querySelector("h1");

      heading?.setAttribute("tabindex", "-1");
      heading?.focus();

    } catch (error) {
      setActionError(error.message);

    } finally {
      ackPending.current = false;
      setAckBusy(false);
    }
  }

  // Fail safely if backend assessment is unavailable.
  if (!assessment) {
    return (
      <main className="flow-page">
        <div className="flow-shell flow-narrow">

          <section
            className="flow-panel"
            aria-busy={!currentResult?.error}
          >
            <h1>
              {currentResult?.error
                ? "Payment check unavailable"
                : "Checking your payment…"}
            </h1>

            <p role="status">
              {currentResult?.error
                ? "We couldn't check this payment. Your details are saved. Try again before continuing."
                : "Please wait while we check the recipient and amount."}
            </p>

            <div className="flow-button-row">
              {currentResult?.error && (
                <button
                  type="button"
                  className="flow-button flow-button-primary"
                  onClick={() =>
                    setRetry((value) => value + 1)
                  }
                >
                  Retry assessment
                </button>
              )}

              <button
                type="button"
                className="flow-button flow-button-secondary"
                onClick={goBack}
              >
                Go back
              </button>
            </div>
          </section>

          {currentResult?.error && (
            <RecipientPaymentHistory
              draft={draft}
              onRetry={() =>
                setRetry((value) => value + 1)
              }
            />
          )}

        </div>
      </main>
    );
  }

  return (
    <>
      {/* Existing Sprint 1 guided payment review */}
      <div ref={contentRef}>
        <PaymentReviewContent
          key={key}
          assessment={assessment}
        />
      </div>

      {/* Sprint 2 contextual payment alert */}
      <dialog
        ref={dialogRef}
        className="payment-review-popup"
        aria-labelledby="payment-review-popup-title"
        aria-describedby="payment-review-popup-description"
        onCancel={(event) => {
          event.preventDefault();
          goBack();
        }}
      >
        <div className="payment-review-popup__body">

          <div className="payment-review-popup__icon">
            <ShieldAlert size={36} />
          </div>

          <h2 id="payment-review-popup-title">
            {firstTimeRecipient
              ? "Wait. Do you know who you're paying?"
              : "Pause before you pay"}
          </h2>

          <p
            id="payment-review-popup-description"
            className="payment-review-popup__subtitle"
          >
            {firstTimeRecipient
              ? "You've never paid this recipient before."
              : "This payment needs an extra safety check."}
          </p>

          <div className="payment-review-popup__transaction">
            <span>YOU'RE ABOUT TO SEND</span>

            <strong>
              {formatSGD(draft.amount)}
            </strong>

            <p>
              To <b>{draft.recipientName}</b>

              <span>
                {" "}
                ({maskIdentifier(draft.recipientNumber)})
              </span>
            </p>
          </div>

          <div className="payment-review-popup__question">
            <h3>
              Have you verified this recipient's identity
              independently?
            </h3>

            <p>
              For example, by contacting them through
              a number you already trust.
            </p>
          </div>

          {actionError && (
            <p
              className="payment-review-popup__error"
              role="alert"
            >
              {actionError}
            </p>
          )}

          <div className="payment-review-popup__actions">
            <button
              type="button"
              className="payment-review-popup__primary"
              onClick={openReview}
              disabled={ackBusy}
            >
              No, help me check
            </button>

            <button
              type="button"
              className="payment-review-popup__secondary"
              onClick={openReview}
              disabled={ackBusy}
            >
              Yes, I've verified
            </button>

            <button
              type="button"
              className="payment-review-popup__cancel"
              onClick={goBack}
              disabled={ackBusy}
            >
              Go back
            </button>
          </div>

          {needsHelp && (
            <div
              className="payment-review-popup__help"
              role="status"
            >
              <h3>
                Here's how to verify safely
              </h3>

              <p>
                Contact the recipient using a phone number
                or official website you found yourself.
                Don't rely on contact details provided
                in a suspicious message.
              </p>

              <button
                type="button"
                className="payment-review-popup__primary"
                onClick={openReview}
              >
                Continue to safety review
              </button>
            </div>
          )}

        </div>
      </dialog>
    </>
  );
}


// ======================================================
// PAYMENT CONFIRMATION GATE
// Check backend assessment before final confirmation.
// Preserve successful payment receipt after draft reset.
// ======================================================

export function PaymentConfirmationGate() {
  const location = useLocation();

  const { assess } = useTransactionRisk();

  const storedReceipt =
    location.state?.completedPayment;

  const receipt =
    storedReceipt?.customerId ===
      sessionStorage.getItem("reventUserId")
      ? storedReceipt
      : null;

  const draft = activeDraft();
  const key = paymentKey(draft);

  const assessRef = useRef(assess);
  assessRef.current = assess;

  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // Completed payments no longer have an active draft.
    if (receipt) return;

    const current = activeDraft();

    if (!current) return;

    const context =
      getRiskAssessment()?.recipientContext || {};

    assessLivePayment(
      current,

      (transaction, additionalContext) =>
        assessRef.current(
          transaction,
          additionalContext
        ),

      context
    )
      .then((assessment) => {
        if (
          cancelled ||
          paymentKey(activeDraft()) !== key
        ) {
          return;
        }

        // Restore server acknowledgement.
        if (
          current.transferType === "ecommerce" &&
          assessment.serverAcknowledged === true
        ) {
          acknowledgeAlert(current);
        }

        saveRiskAssessment(current, assessment);

        // Prevent bypassing the guided review
        // or existing payment restrictions.
        const requiresGuidedReview =
          !canConfirm() ||
          assessment.canProceedToConfirmation !== true ||
          (
            assessment.conditions?.firstTimeRecipient &&
            !hasAcknowledgedAlert(current)
          );

        setResult({
          key,
          retry,
          reviewRequired: requiresGuidedReview,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            key,
            retry,
            error: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, retry, receipt]);

  // Display receipt after clearing the active draft.
  if (receipt) {
    return <PaymentConfirmation />;
  }

  if (!draft) {
    return <Navigate to="/transfer" replace />;
  }

  const current =
    result?.key === key &&
    result?.retry === retry
      ? result
      : null;

  if (current?.reviewRequired) {
    return <Navigate to="/transfer/review" replace />;
  }

  if (current && !current.error) {
    return <PaymentConfirmation />;
  }

  return (
    <main className="flow-page">
      <div className="flow-shell flow-narrow">

        <section
          className="flow-panel"
          aria-busy={!current?.error}
        >
          <h1>
            {current?.error
              ? "Payment check unavailable"
              : "Checking your payment…"}
          </h1>

          <p role="status">
            {current?.error
              ? "We couldn't verify your payment history. Please try again before continuing."
              : "We are checking the recipient and payment details."}
          </p>

          {current?.error && (
            <button
              type="button"
              className="flow-button flow-button-primary"
              onClick={() =>
                setRetry((value) => value + 1)
              }
            >
              Retry assessment
            </button>
          )}
        </section>

      </div>
    </main>
  );
}