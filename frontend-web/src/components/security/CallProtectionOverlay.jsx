import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PhoneOff, MonitorOff, ShieldAlert, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useSimulator } from "../../context/SimulatorContext";
import "./CallProtectionOverlay.css";

export default function CallProtectionOverlay() {
  const navigate = useNavigate();
  const { triggers, resetTriggers } = useSimulator();

  const isOnCall = Boolean(triggers.isOnCall);
  const isScreenSharing = Boolean(triggers.isScreenSharing);
  // const isBlocked = isScreenSharing || (isOnCall && !isTrustedCaller);
  const [callerNumber, setCallerNumber] = useState(
    () => sessionStorage.getItem("reventSimulatedCaller") || "",
  );

  useEffect(() => {
    function syncCaller() {
      setCallerNumber(sessionStorage.getItem("reventSimulatedCaller") || "");
    }

    window.addEventListener("revent-caller-change", syncCaller);

    return () => {
      window.removeEventListener("revent-caller-change", syncCaller);
    };
  }, []);

  const trustedCallers = (() => {
    try {
      return JSON.parse(localStorage.getItem("reventTrustedCallers")) || [];
    } catch {
      return [];
    }
  })();

  const normalise = (value) => String(value || "").replace(/\D/g, "");

  const isTrustedCaller =
    callerNumber.trim() !== "" &&
    trustedCallers.some(
      (contact) => normalise(contact.number) === normalise(callerNumber),
    );
    const isBlocked = isScreenSharing || (isOnCall && !isTrustedCaller);
  useEffect(() => {
    if (!isBlocked) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isBlocked]);

  if (!isBlocked) return null;

  let title;
  let message;
  let instruction;
  let Icon;

  if (isOnCall && isScreenSharing) {
    title = "Someone Could Be Watching!";
    message = "Your call and screen sharing may expose your banking details.";
    instruction = "End your call and stop sharing to continue.";
    Icon = ShieldAlert;
  } else if (isScreenSharing) {
    title = "Your Screen Is Exposed!";
    message = "Someone may be viewing your balance and personal information.";
    instruction = "Stop screen sharing to continue.";
    Icon = MonitorOff;
  } else {
    title = "End Your Call to Continue";
    message = "Your call may put your banking information at risk.";
    instruction = "End your call or manage your trusted callers.";
    Icon = PhoneOff;
  }

  return createPortal(
    <div className="call-protection-overlay">
      <div
        className="call-protection-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="call-protection-title"
        aria-describedby="call-protection-description"
      >
        <div className="call-protection-icon">
          <Icon size={38} />
        </div>

        <span className="call-protection-label">REVENT SECURITY ALERT</span>

        <h2 id="call-protection-title">{title}</h2>

        <p id="call-protection-description">{message}</p>

        <div className="call-protection-status">
          <LockKeyhole size={19} />
          Banking temporarily locked
        </div>

        <p className="call-protection-footer">{instruction}</p>

        {isOnCall && !isScreenSharing && (
          <button
            type="button"
            className="call-protection-trusted-btn"
            onClick={() => navigate("/trusted-callers")}
          >
            Manage Trusted Callers
          </button>
        )}

        <button
          type="button"
          onClick={resetTriggers}
          className="call-protection-demo-reset"
        >
          End call (Reset simulator)
        </button>
      </div>
    </div>,
    document.body,
  );
}
