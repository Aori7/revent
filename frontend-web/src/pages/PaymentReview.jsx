import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import { ShieldAlert } from "lucide-react";
import PaymentReviewContent from "./PaymentReviewContent";
import RecipientPaymentHistory from "../components/RecipientPaymentHistory";
import useTransactionRisk from "../hooks/useTransactionRisk";
import { activeDraft } from "../utils/demoSession";
import { formatSGD, maskIdentifier } from "../utils/banking";
import {
  acknowledgeAlert,
  clearRiskAssessment,
  getRiskAssessment,
  hasAcknowledgedAlert,
  paymentKey,
  saveRiskAssessment,
} from "../utils/riskSession";
import usePaymentRestriction from "../utils/usePaymentRestriction";

import "../css/banking-flow.css";
import "../css/payment-review-popup.css";

export default function PaymentReview() {
  const navigate = useNavigate();
  const [needsHelp, setNeedsHelp] = useState(false);
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

  useEffect(() => {
    const refresh = () => setRetry((value) => value + 1);

    window.addEventListener("revent-transactions-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("revent-transactions-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const current = activeDraft();

    if (!current) return;

    if (contextRef.current.key !== key) {
      contextRef.current = {
        key,
        value: getRiskAssessment()?.recipientContext || {},
      };
    }

    clearRiskAssessment();

    Promise.resolve()
      .then(() => assess(current, contextRef.current.value))
      .then((assessment) => {
        if (cancelled || paymentKey(activeDraft()) !== key) return;

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

  const showAlert =
    (firstTimeRecipient || assessment?.requiresReview === true) &&
    acknowledged !== key &&
    !hasAcknowledgedAlert(draft);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;

    if (showAlert && dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [showAlert]);

  if (!draft) {
    return <Navigate to="/transfer" replace />;
  }

  function goBack() {
    navigate("/transfer/ecommerce");
  }

  function openReview() {
    try {
      acknowledgeAlert(draft);
      setAcknowledged(key);
      setActionError("");

      dialogRef.current?.close();

      const heading = contentRef.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    } catch (error) {
      setActionError(error.message);
    }
  }

  if (!assessment) {
    return (
      <main className="flow-page">
        <div className="flow-shell flow-narrow">
          <section className="flow-panel" aria-busy={!currentResult?.error}>
            <h1>
              {currentResult?.error
                ? "Payment check unavailable"
                : "Checking your payment…"}
            </h1>

            <p role="status">
              {currentResult?.error
                ? "We couldn’t check this payment. Your details are saved. Try again before continuing."
                : "Please wait while we check the recipient and amount."}
            </p>

            <div className="flow-button-row">
              {currentResult?.error && (
                <button
                  type="button"
                  className="flow-button flow-button-primary"
                  onClick={() => setRetry((value) => value + 1)}
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
              onRetry={() => setRetry((value) => value + 1)}
            />
          )}
        </div>
      </main>
    );
  }

  return (
    <>
      <div ref={contentRef}>
        <PaymentReviewContent key={key} assessment={assessment} />
      </div>

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

            <strong>{formatSGD(draft.amount)}</strong>

            <p>
              To <b>{draft.recipientName}</b>
              <span> ({maskIdentifier(draft.recipientNumber)})</span>
            </p>
          </div>

          <div className="payment-review-popup__question">
            <h3>Have you verified this recipient's identity independently?</h3>

            <p>
              For example, by contacting them through a number you already
              trust.
            </p>
          </div>

          {actionError && (
            <p className="payment-review-popup__error" role="alert">
              {actionError}
            </p>
          )}

          <div className="payment-review-popup__actions">
            <button
              type="button"
              className="payment-review-popup__primary"
              onClick={openReview}
            >
              No, help me check
            </button>

            <button
              type="button"
              className="payment-review-popup__secondary"
              onClick={openReview}
            >
              Yes, I've verified
            </button>

            <button
              type="button"
              className="payment-review-popup__cancel"
              onClick={goBack}
            >
              Go back
            </button>
          </div>

          {needsHelp && (
            <div className="payment-review-popup__help" role="status">
              <h3>Here's how to verify safely</h3>

              <p>
                Contact the recipient using a phone number or official website
                you found yourself. Don't rely on contact details provided in a
                suspicious message.
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
