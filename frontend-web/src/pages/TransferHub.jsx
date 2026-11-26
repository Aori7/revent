import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Smartphone,
  Landmark,
  QrCode,
  CalendarClock,
  Users,
  History,
  ArrowRight,
  ShoppingCart,
  BookmarkCheck,
} from "lucide-react";

import PageBanner from "../components/PageBanner";

import {
  getSavedReview,
  restoreSavedPaymentReview,
  saveDraft,
  saveAnswers,
} from "../utils/demoSession";

import {
  formatSGD,
  maskIdentifier,
} from "../utils/banking";

import "../css/transfer-hub.css";
import "../css/banking-flow.css";

import useSavedPaymentReview from "../hooks/useSavedPaymentReview";

import {
  getSavedPaymentReview,
} from "../services/paymentReviewApi";

const transferOptions = [
  {
    title: "PayNow",
    description:
      "Send money using a mobile number, NRIC/FIN or UEN.",
    icon: Smartphone,
    path: "/transfer/paynow",
  },
  {
    title: "Bank Transfer",
    description:
      "Transfer funds to another bank account.",
    icon: Landmark,
    path: "/transfer/bank",
  },
  {
    title: "Scan & Pay",
    description:
      "Make payments using a QR code.",
    icon: QrCode,
    path: "/transfer/scan",
  },
  {
    title: "Scheduled Transfer",
    description:
      "Schedule a payment for a future date.",
    icon: CalendarClock,
    path: "/transfer/scheduled",
  },
  {
    title: "Manage Recipients",
    description:
      "Add, view and manage saved recipients.",
    icon: Users,
    path: "/transfer/recipients",
  },
  {
    title: "Transaction History",
    description:
      "View your previous transfers and payments.",
    icon: History,
    path: "/transfer/history",
  },
  {
    title: "E-commerce Payment",
    description:
      "Review and pay for an online purchase.",
    icon: ShoppingCart,
    path: "/transfer/ecommerce",
  },
];

export default function TransferHub() {
  const navigate = useNavigate();

  const {
    saved,
    savedError,
  } = useSavedPaymentReview();

  const [resumeError, setResumeError] = useState("");

  async function resumeReview() {
    setResumeError("");

    try {
      // Read again in case the saved review has changed.
      const currentSaved =
        saved?.draft.transferType === "ecommerce"
          ? await getSavedPaymentReview()
          : getSavedReview();

      if (!currentSaved) {
        setResumeError(
          "This saved review is no longer available. Start a new payment below."
        );

        return;
      }

      // Restore both payment details and previous answers.
      if (currentSaved.draft.transferType === "ecommerce") {
        restoreSavedPaymentReview(currentSaved);
      } else {
        const resumedDraft = saveDraft(
          currentSaved.draft
        );

        saveAnswers(
          resumedDraft,
          currentSaved.answers
        );
      }

      // The review page requests a fresh risk assessment.
      navigate("/transfer/review");
    } catch (error) {
      setResumeError(
        error.message ||
          "We couldn’t reopen your review. Please try again."
      );
    }
  }

  return (
    <main className="transfer-hub-page">
      <PageBanner
        eyebrow="Everyday Banking / Transfers & Payments"
        title="Transfer & Pay"
        description="Move your money securely, wherever it needs to go."
      />

      <div className="transfer-hub-content">
        {savedError && (
          <p
            className="flow-inline-error"
            role="alert"
          >
            {savedError}
          </p>
        )}

        {saved && (
          <section
            className="flow-panel"
            aria-labelledby="saved-review-title"
          >
            <div className="flow-section-title">
              <div>
                <span className="flow-eyebrow">
                  CONTINUE WHERE YOU LEFT OFF
                </span>

                <h2 id="saved-review-title">
                  Saved payment review
                </h2>
              </div>

              <BookmarkCheck
                size={28}
                className="flow-red"
                aria-hidden="true"
              />
            </div>

            <p className="flow-muted">
              Your payment details and previous answers are saved.
              No payment has been sent.
            </p>

            <dl className="flow-detail-list">
              <div className="flow-detail-row">
                <dt>Recipient</dt>
                <dd>{saved.draft.recipientName}</dd>
              </div>

              <div className="flow-detail-row">
                <dt>Account / mobile</dt>

                <dd>
                  {maskIdentifier(saved.draft.recipientNumber)}
                </dd>
              </div>

              <div className="flow-detail-row">
                <dt>Amount</dt>

                <dd>
                  {formatSGD(saved.draft.amount)}
                </dd>
              </div>

              <div className="flow-detail-row">
                <dt>Reference</dt>

                <dd>
                  {saved.draft.reference || "—"}
                </dd>
              </div>
            </dl>

            {resumeError && (
              <p
                className="flow-inline-error"
                role="alert"
              >
                {resumeError}
              </p>
            )}

            <div className="flow-button-row">
              <button
                type="button"
                className="flow-button flow-button-primary"
                onClick={resumeReview}
              >
                Resume review

                <ArrowRight
                  size={18}
                  aria-hidden="true"
                />
              </button>
            </div>

            <p className="flow-muted flow-small">
              {saved.draft.transferType === "ecommerce"
                ? "Available after you sign in again."
                : "Available in this browser tab until the session ends."}
            </p>
          </section>
        )}

        <div className="transfer-hub-heading">
          <h2>What would you like to do?</h2>

          <p>
            Choose a payment method to get started.
          </p>
        </div>

        <div className="transfer-hub-grid">
          {transferOptions.map((option) => {
            const Icon = option.icon;

            return (
              <Link
                key={option.title}
                to={option.path}
                className="transfer-hub-card"
              >
                <div className="transfer-hub-icon">
                  <Icon size={28} />
                </div>

                <h3>{option.title}</h3>

                <p>{option.description}</p>

                <span className="transfer-hub-card-action">
                  Get started

                  <ArrowRight size={18} />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="transfer-hub-notice">
          <strong>
            Stay protected with REVENT
          </strong>

          <p>
            Our transaction risk assessment helps identify suspicious
            activity before you complete a transfer.
          </p>
        </div>
      </div>
    </main>
  );
}