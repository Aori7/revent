import { useState } from "react";
import {
  ScanLine,
  ArrowLeftRight,
  ReceiptText,
  UsersRound,
  Grid2X2,
  ChevronDown,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import QuickAction from "./QuickAction";
import PayNowQR from "../../assets/PayNowLogo.png";

const bankingActions = [
  {
    id: "paynow",
    title: "PayNow",
    icon: PayNowQR,
    path: "/transfer/paynow",
  },
  {
    id: "scan",
    title: "Scan & Pay",
    icon: ScanLine,
    path: "/transfer/scan",
  },
  {
    id: "transfer",
    title: "Transfer",
    icon: ArrowLeftRight,
    path: "/transfer",
  },
  {
    id: "bills",
    title: "Pay bills",
    icon: ReceiptText,
    path: "/transfer",
  },
  {
    id: "payees",
    title: "Manage payees",
    icon: UsersRound,
    path: "/transfer/recipients",
  },
  {
    id: "more",
    title: "More services",
    icon: Grid2X2,
    path: "/more",
  },
];

function EverydayBanking() {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const primaryActions = bankingActions.slice(0, 3);
  const secondaryActions = bankingActions.slice(3);

  const renderAction = (action) => (
    <QuickAction
      key={action.id}
      icon={action.icon}
      title={action.title}
      onClick={() => navigate(action.path)}
    />
  );

  return (
    <section className="everyday-banking">
      <div className="everyday-banking-header">
        <h2>Everyday Banking</h2>
      </div>

      <div className="banking-actions">{primaryActions.map(renderAction)}</div>

      <div
        className={`banking-extra ${showMore ? "expanded" : ""}`}
        aria-hidden={!showMore}
      >
        <div className="banking-actions banking-extra-grid">
          {secondaryActions.map(renderAction)}
        </div>
      </div>

      <button
        type="button"
        className="banking-more-toggle"
        aria-expanded={showMore}
        onClick={() => setShowMore((prev) => !prev)}
      >
        {showMore ? "Show less" : "More banking services"}

        <ChevronDown size={17} className={showMore ? "rotated" : ""} />
      </button>
    </section>
  );
}

export default EverydayBanking;
