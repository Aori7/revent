import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CircleAlert } from "lucide-react";

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
                ? "We couldn’t check this payment. Your details are saved. Try again before continuing."
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
      <div ref={contentRef}>
        <PaymentReviewContent
          key={key}
          assessment={assessment}
        />
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
          <span
            className="payment-review-popup__icon"
            aria-hidden="true"
          >
            <CircleAlert size={34} />
          </span>

          <h2 id="payment-review-popup-title">
            {firstTimeRecipient
              ? "First payment to this recipient"
              : "Pause before you pay"}
          </h2>

          <p id="payment-review-popup-description">
            You’re sending {formatSGD(draft.amount)} to{" "}
            {draft.recipientName} (
            {maskIdentifier(draft.recipientNumber)}).
            {firstTimeRecipient
              ? " There is no completed outgoing payment to this recipient in your payment history. Check their identity and the payment request before continuing."
              : " Check the recipient and payment request before continuing."}
          </p>

          <ul className="payment-review-popup__reasons">
            {firstTimeRecipient ? (
              <li>
                Verify the request using a trusted contact number,
                especially if it came through a voice or video call.
              </li>
            ) : (
              assessment.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))
            )}
          </ul>

          {actionError && <p role="alert">{actionError}</p>}

          <div className="payment-review-popup__actions">
            <button
              type="button"
              className="payment-review-popup__primary"
              onClick={openReview}
            >
              Review payment
            </button>

            <button
              type="button"
              className="payment-review-popup__secondary"
              onClick={goBack}
            >
              Go back
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}