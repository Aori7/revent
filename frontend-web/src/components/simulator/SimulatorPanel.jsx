import {
  PhoneCall,
  MonitorUp,
  ShieldAlert,
  Smartphone,
  Zap,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { setRestriction } from "../../utils/demoSession";
import usePaymentRestriction from "../../utils/usePaymentRestriction";

import { useSimulator } from "../../context/SimulatorContext";

const riskOptions = [
  {
    key: "isOnCall",
    label: "Active Phone Call",
    icon: PhoneCall,
  },
  {
    key: "isScreenSharing",
    label: "Screen Sharing",
    icon: MonitorUp,
  },
  {
    key: "hasScamReports",
    label: "Suspicious Recipient",
    icon: ShieldAlert,
  },
  {
    key: "isUnfamiliarDevice",
    label: "Unrecognised Device",
    icon: Smartphone,
  },
  {
    key: "hasRapidTransfers",
    label: "Rapid Transactions",
    icon: Zap,
  },
];

export default function SimulatorPanel() {
  const restriction = usePaymentRestriction();

  const { triggers, toggleTrigger, resetTriggers } = useSimulator();
  const [callerNumber, setCallerNumber] = useState(
    () => sessionStorage.getItem("reventSimulatedCaller") || "",
  );

  function updateCallerNumber(value) {
    setCallerNumber(value);
    sessionStorage.setItem("reventSimulatedCaller", value);
    window.dispatchEvent(new Event("revent-caller-change"));
  }
  return (
    <div className="simulator-panel">
      <div className="simulator-panel-header">
        <h2>Simulation Controls</h2>
      </div>

      <p className="simulator-description">
        Simulate different banking conditions to test REVENT's security
        features.
      </p>

      <label htmlFor="payment-restriction">Payment restriction (demo)</label>

      <select
        id="payment-restriction"
        value={restriction}
        onChange={(event) => setRestriction(event.target.value)}
      >
        <option value="">None</option>
        <option>High-risk payment restriction</option>
        <option>Cooling-off period active</option>
      </select>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="simulated-caller">Simulated Caller Number</label>

        <input
          id="simulated-caller"
          type="tel"
          value={callerNumber}
          onChange={(e) => updateCallerNumber(e.target.value)}
          placeholder="e.g. 91234567"
          style={{
            width: "100%",
            padding: 10,
            marginTop: 8,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
      </div>
      <div className="simulator-options">
        {riskOptions.map(({ key, label, icon: Icon }) => (
          <label key={key} className="simulator-option">
            <Icon size={25} />

            <span>{label}</span>

            <input
              type="checkbox"
              checked={triggers[key]}
              onChange={() => toggleTrigger(key)}
              aria-label={label}
            />
          </label>
        ))}
      </div>

      <button type="button" className="simulator-reset" onClick={resetTriggers}>
        <RotateCcw size={18} />
        Reset Risk Triggers
      </button>
    </div>
  );
}
