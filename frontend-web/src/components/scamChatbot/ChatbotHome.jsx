
import { useState } from "react";

import {
  ShieldCheck,
  ScanSearch,
  MailWarning,
  LockKeyhole,
  AlertTriangle,
  Link2
} from "lucide-react";

import MessageInput from "./MessageInput";
import ImageUploadNotice from "./ImageUploadNotice";

export default function ChatbotHome({
  message,
  setMessage,
  onAnalyse,
  loading,
  error
}) {
  const [processing, setProcessing] = useState(false);

  // Add extracted image text to message
  function handleExtractedText(text) {
    setMessage((previous) => {
      const combined = previous.trim()
        ? `${previous.trim()}\n\n${text}`
        : text;

      return combined.slice(0, 5000);
    });
  }

  return (
    <>
      <section className="scam-red-header">
        <div>
          <h1>AI Chatbot</h1>
          <h2>Scam Verification</h2>
          <p>Spot suspicious messages before you respond.</p>
        </div>

        <div className="scam-header-icon">
          <ShieldCheck size={35} strokeWidth={1.5} />
        </div>
      </section>

      <section className="scam-main-content">
        <h2>Check suspicious content</h2>

        <p className="scam-input-description">
          Paste a suspicious message or upload a screenshot
          to check for potential scam warning signs.
        </p>

        <MessageInput
          message={message}
          setMessage={setMessage}
          disabled={loading || processing}
        />

        <div className="scam-security-note">
          <LockKeyhole size={13} />

          <span>
            Never share OTPs, PINs or passwords.
          </span>
        </div>

        <div className="scam-upload-row">
          <ImageUploadNotice
            onExtract={handleExtractedText}
            onProcessingChange={setProcessing}
            disabled={loading}
          />
        </div>

        <p className="scam-attachment-hint">
          Supported images: JPG, PNG and WEBP.
          Maximum size: 10 MB.
          Review and remove sensitive information from
          extracted text before submitting it for AI analysis.
        </p>

        <div className="scam-analyse-row">
          <button
            type="button"
            className="scam-primary-button"
            onClick={onAnalyse}
            disabled={
              loading ||
              processing ||
              !message.trim()
            }
          >
            <ScanSearch size={19} />

            {loading
              ? "Analysing..."
              : processing
              ? "Scanning image..."
              : "Analyse Content"}
          </button>
        </div>

        {error && (
          <p className="scam-error" role="alert">
            {error}
          </p>
        )}

        <p className="scam-disclaimer scam-centered">
          AI assessments are guidance, not proof that
          content is safe.
        </p>

        <div className="scam-checks-box">
          <h3>What does our AI check?</h3>

          <div className="scam-check-item">
            <AlertTriangle size={17} />
            <span>Urgent or threatening language</span>
          </div>

          <div className="scam-check-item">
            <Link2 size={17} />
            <span>Suspicious links and requests</span>
          </div>

          <div className="scam-check-item">
            <MailWarning size={17} />
            <span>Impersonation warning signs</span>
          </div>
        </div>
      </section>
    </>
  );
}
