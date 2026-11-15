import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  ScanLine,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FlaskConical,
  Store,
  UserRound,
  X,
} from "lucide-react";

import PageBanner from "../components/PageBanner";
import useTransactionRisk from "../hooks/useTransactionRisk";
import { saveRiskAssessment } from "../utils/riskSession";
import { saveDraft } from "../utils/demoSession";
import { demoAccount } from "../data/demoBanking";

import "../css/scan-and-pay.css";

// These are fictional recipients, not real banking accounts.
const DEMO_RECIPIENTS = {
  merchant: {
    id: "merchant",
    name: "Sunrise Cafe",
    number: "DEMO-UEN-001",
    bank: "Demo Merchant",
    type: "merchant",
    isNewRecipient: false,
    reportedRecipient: false,
  },
  suspicious: {
    id: "suspicious",
    name: "Unknown Trading",
    number: "DEMO-UEN-002",
    bank: "Demo Merchant",
    type: "merchant",
    isNewRecipient: true,
    reportedRecipient: true,
  },
};

// A supported test QR contains one of these exact strings:
// REVENT-DEMO:merchant
// REVENT-DEMO:suspicious
function parseDemoQR(rawValue) {
  const prefix = "REVENT-DEMO:";

  if (!rawValue.startsWith(prefix)) {
    return null;
  }

  const id = rawValue.slice(prefix.length).trim();

  return DEMO_RECIPIENTS[id] || null;
}

export default function ScanAndPay() {
  const navigate = useNavigate();
  const { assess } = useTransactionRisk();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const frameRef = useRef(null);
  const sessionRef = useRef(0);
  const scanningRef = useRef(false);

  const [cameraStatus, setCameraStatus] = useState("off");
  const [cameraMessage, setCameraMessage] = useState("");
  const [recipient, setRecipient] = useState(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  const cameraActive = cameraStatus === "active";

  function stopCamera() {
    // Invalidates pending camera requests and scan callbacks.
    sessionRef.current += 1;
    scanningRef.current = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const video = videoRef.current;

    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    detectorRef.current = null;
    setCameraStatus("off");
  }

  function selectRecipient(nextRecipient) {
    stopCamera();
    setRecipient(nextRecipient);
    setAmount("");
    setReference("");
    setError("");
    setCameraMessage("");
  }

  async function startCamera() {
    stopCamera();

    const session = sessionRef.current;

    setError("");
    setCameraMessage("");
    setCameraStatus("starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setCameraMessage(
        "Camera access is unavailable. Use localhost or HTTPS, or try a demo scan."
      );
      return;
    }

    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      // User may have left the page while permission was pending.
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error("Camera preview is unavailable.");
      }

      video.srcObject = stream;
      await video.play();

      if (session !== sessionRef.current) return;

      setCameraStatus("active");

      if ("BarcodeDetector" in window) {
        try {
          const supported =
            await window.BarcodeDetector.getSupportedFormats();

          if (supported.includes("qr_code")) {
            detectorRef.current = new window.BarcodeDetector({
              formats: ["qr_code"],
            });
          }
        } catch (err) {
          console.warn("QR detection unavailable:", err);
        }
      }

      if (session !== sessionRef.current) return;

      if (detectorRef.current) {
        setCameraMessage(
          "Camera ready. Point it at a REVENT demo QR code."
        );

        scanFrame(session);
      } else {
        setCameraMessage(
          "Camera preview is active. Automatic QR recognition is not supported in this browser. Use a demo scan below."
        );
      }
    } catch (err) {
      if (session !== sessionRef.current) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      console.error("Camera error:", err);
      stopCamera();

      setCameraStatus("error");
      setCameraMessage(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings or use a demo scan."
          : "Unable to start the camera. You can still use the simulated QR scanner."
      );
    }
  }

  async function scanFrame(session) {
    if (session !== sessionRef.current) return;

    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector) return;

    if (
      video.readyState >= 2 &&
      !scanningRef.current
    ) {
      scanningRef.current = true;

      try {
        const codes = await detector.detect(video);

        if (session !== sessionRef.current) return;

        for (const code of codes) {
          const found = parseDemoQR(code.rawValue || "");

          if (found) {
            selectRecipient(found);
            return;
          }

          if (codes.length > 0) {
            setCameraMessage(
              "QR detected, but it is not a supported REVENT demo QR code."
            );
          }
        }
      } catch (err) {
        console.warn("QR scan failed:", err);
      } finally {
        scanningRef.current = false;
      }
    }

    if (session === sessionRef.current) {
      frameRef.current = requestAnimationFrame(() =>
        scanFrame(session)
      );
    }
  }

  // Stop the camera when leaving this page.
  useEffect(() => {
    return () => {
      sessionRef.current += 1;

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  function resetScanner() {
    stopCamera();
    setRecipient(null);
    setAmount("");
    setReference("");
    setError("");
    setCameraMessage("");
  }

  function submitPayment(event) {
    event.preventDefault();
    setError("");

    if (!recipient) {
      setError("Please scan or select a recipient.");
      return;
    }

    const value = Number(amount);

    if (
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > demoAccount.balance
    ) {
      setError(
        "Enter a valid amount within your available balance."
      );
      return;
    }

    try {
      const draft = saveDraft({
        transferType: "scanpay",
        recipientName: recipient.name,
        recipientNumber: recipient.number,
        bankName: recipient.bank,
        amount: value,
        reference,
      });

      // Keep the same risk hook used by PayNow/Bank Transfer.
      const riskResult = assess(draft, {
        isNewRecipient: recipient.isNewRecipient,
        // A reported recipient is a demo risk signal.
        // Whether it affects the score depends on the hook.
        reportedRecipient: recipient.reportedRecipient,
      });

      saveRiskAssessment(draft, riskResult);

      if (riskResult.level === "low") {
        navigate("/transfer/confirmation");
      } else {
        navigate("/transfer/review");
      }
    } catch (err) {
      setError(err.message || "Unable to review payment.");
    }
  }

  return (
    <main className="scanpay-page">
      <PageBanner
        eyebrow="Transfers & Payments / Scan & Pay"
        title="Scan & Pay"
        description="Scan a QR code to pay securely."
      />

      <div className="scanpay-container">
        <Link to="/transfer" className="scanpay-back">
          <ArrowLeft size={18} />
          Back to Transfer & Pay
        </Link>

        <section className="scanpay-panel">
          <div className="scanpay-heading">
            <div className="scanpay-heading-icon">
              <ScanLine size={25} />
            </div>

            <div>
              <h2>
                {recipient
                  ? "Review QR Recipient"
                  : "Scan a QR Code"}
              </h2>
              <p>
                {recipient
                  ? "Check who you're paying before continuing."
                  : "Position a QR code inside the scanner."}
              </p>
            </div>
          </div>

          {!recipient ? (
            <>
              <div className="scanpay-camera">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`scanpay-video ${
                    cameraActive ? "visible" : ""
                  }`}
                />

                {!cameraActive && (
                  <div className="scanpay-camera-placeholder">
                    <Camera size={42} />
                    <strong>
                      {cameraStatus === "starting"
                        ? "Starting camera..."
                        : "Camera is off"}
                    </strong>
                    <span>
                      Enable your camera to preview
                      the QR scanner.
                    </span>
                  </div>
                )}

                <div className="scanpay-frame">
                  <span className="scanpay-corner tl" />
                  <span className="scanpay-corner tr" />
                  <span className="scanpay-corner bl" />
                  <span className="scanpay-corner br" />

                  {cameraActive && (
                    <div className="scanpay-line" />
                  )}
                </div>

                <div className="scanpay-camera-label">
                  <ScanLine size={15} />
                  {cameraActive
                    ? "Camera active"
                    : "QR scanner"}
                </div>
              </div>

              {cameraMessage && (
                <p
                  className="scanpay-camera-message"
                  role="status"
                >
                  {cameraMessage}
                </p>
              )}

              <div className="scanpay-camera-actions">
                {!cameraActive ? (
                  <button
                    type="button"
                    className="scanpay-primary"
                    disabled={cameraStatus === "starting"}
                    onClick={startCamera}
                  >
                    <Camera size={19} />
                    {cameraStatus === "starting"
                      ? "Starting..."
                      : "Enable Camera"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="scanpay-secondary"
                    onClick={stopCamera}
                  >
                    <CameraOff size={19} />
                    Turn Off Camera
                  </button>
                )}
              </div>

              <div className="scanpay-divider" />

              <details className="scanpay-demo" open>
                <summary>
                  <FlaskConical size={19} />
                  Prototype QR Simulation
                </summary>

                <p>
                  No camera needed. Select a demo QR
                  scenario to test the payment flow.
                </p>

                <div className="scanpay-demo-options">
                  <button
                    type="button"
                    onClick={() =>
                      selectRecipient(DEMO_RECIPIENTS.merchant)
                    }
                  >
                    <Store size={22} />
                    <span>
                      <strong>Normal Merchant</strong>
                      <small>Sunrise Cafe</small>
                    </span>
                    <ArrowRight size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectRecipient(
                        DEMO_RECIPIENTS.suspicious
                      )
                    }
                  >
                    <AlertTriangle size={22} />
                    <span>
                      <strong>Suspicious Recipient</strong>
                      <small>Unknown Trading</small>
                    </span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              </details>
            </>
          ) : (
            <form onSubmit={submitPayment}>
              <div className="scanpay-success-heading">
                <CheckCircle2 size={20} />
                Demo QR recipient loaded
              </div>

              <div className="scanpay-recipient">
                <div className="scanpay-recipient-icon">
                  {recipient.type === "merchant" ? (
                    <Store size={25} />
                  ) : (
                    <UserRound size={25} />
                  )}
                </div>

                <div>
                  <span>Paying to</span>
                  <h3>{recipient.name}</h3>
                  <p>{recipient.number}</p>
                </div>
              </div>

              {recipient.reportedRecipient && (
                <div className="scanpay-warning">
                  <AlertTriangle size={21} />
                  <p>
                    <strong>
                      Prototype risk indicator
                    </strong>
                    <span>
                      This fictional recipient is marked
                      as previously reported for testing.
                      Review the payment carefully.
                    </span>
                  </p>
                </div>
              )}

              <div className="scanpay-field">
                <label htmlFor="scanpay-amount">
                  Amount (SGD)
                </label>

                <div className="scanpay-amount">
                  <span>S$</span>
                  <input
                    id="scanpay-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="scanpay-field">
                <label htmlFor="scanpay-reference">
                  Payment reference (optional)
                </label>

                <input
                  id="scanpay-reference"
                  type="text"
                  placeholder="What's this payment for?"
                  maxLength={120}
                  value={reference}
                  onChange={(event) =>
                    setReference(event.target.value)
                  }
                />
              </div>

              <div className="scanpay-security">
                <ShieldCheck size={20} />
                <p>
                  REVENT will assess this transaction
                  before final confirmation.
                </p>
              </div>

              {error && (
                <p className="scanpay-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="scanpay-primary"
              >
                Continue
                <ArrowRight size={19} />
              </button>

              <button
                type="button"
                className="scanpay-reset"
                onClick={resetScanner}
              >
                <RotateCcw size={17} />
                Scan Another QR Code
              </button>
            </form>
          )}
        </section>

        <p className="scanpay-disclaimer">
          REVENT prototype. QR recipients are fictional.
          No real payment is made.
        </p>
      </div>
    </main>
  );
}
