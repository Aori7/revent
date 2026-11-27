
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { getRisingScamTrend } from "../../services/scamAwarenessService";

import "../../css/dashboard/scam-awareness-bubble.css";

export default function ScamAwarenessBubble() {
  const [trend, setTrend] = useState(() =>
    getRisingScamTrend()
  );

  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const showDetails = isHovered || isRevealed;

  useEffect(() => {
    function updateTrend() {
      setTrend(getRisingScamTrend());
    }

    function handleStorage(event) {
      if (
        event.key === "reventSuspiciousRecipientReportsV1" ||
        event.key === null
      ) {
        updateTrend();
      }
    }

    updateTrend();

    window.addEventListener(
      "revent-reports-updated",
      updateTrend
    );

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", updateTrend);

    const interval = window.setInterval(
      updateTrend,
      60000
    );

    return () => {
      window.removeEventListener(
        "revent-reports-updated",
        updateTrend
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "focus",
        updateTrend
      );

      window.clearInterval(interval);
    };
  }, []);

  // Reset interaction when the highlighted category changes.
  useEffect(() => {
    setIsHovered(false);
    setIsRevealed(false);
  }, [trend.category, trend.showAlert]);

  // =====================================
  // SIMPLE BANNER: 0–5 REPORTS
  // =====================================

  if (!trend.showAlert) {
    return (
      <section
        className="sab-wrapper sab-simple-banner"
        aria-label="Banking safety reminder"
      >
        <h2 className="sab-banner-title">
          Think twice before you transfer.
        </h2>

        <p className="sab-banner-description">
          A moment of doubt could save your money.
        </p>
      </section>
    );
  }

  // =====================================
  // INTERACTIVE ALERT: 6 OR MORE REPORTS
  // =====================================

  return (
    <section
      className="sab-wrapper sab-reported"
      aria-label="Scam awareness"
    >
      <div className="sab-header">
        <span className="sab-period">
          Last 7 days
        </span>

        <span
          className="sab-report-count"
          aria-label={`${trend.currentCount} ${trend.category} reports`}
        >
          {trend.currentCount} reported
        </span>
      </div>

      <button
        type="button"
        className={`sab-message-button ${
          showDetails ? "sab-revealed" : ""
        }`}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            setIsHovered(true);
          }
        }}
        onPointerLeave={() => setIsHovered(false)}
        onClick={() =>
          setIsRevealed((previous) => !previous)
        }
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsHovered(false);
            setIsRevealed(false);
          }
        }}
        aria-expanded={showDetails}
        aria-label={`${trend.headline} ${trend.message}`}
      >
        <span
          className="sab-message sab-front"
          aria-hidden={showDetails}
        >
          {trend.headline}
        </span>

        <span
          className="sab-message sab-back"
          aria-hidden={!showDetails}
        >
          {trend.message}
        </span>
      </button>

      <div className="sab-footer">
        <span className="sab-source">
          Recent reports
        </span>

        <Link
          to="/scam-awareness"
          className="sab-details-link"
        >
          View trends
        </Link>
      </div>
    </section>
  );
}
