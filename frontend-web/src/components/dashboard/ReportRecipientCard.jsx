import { Link } from "react-router-dom";
import { ShieldAlert, ArrowRight } from "lucide-react";
import "../../css/report-recipient.css";

export default function ReportRecipientCard() {
  return (
    <section className="report-recipient-card">
      <div className="report-recipient-card-content">
        <ShieldAlert size={28} />

        <div>
          <h2>Report Suspicious Recipient</h2>
          <p>
            Encountered a suspicious payment recipient?
            Submit a report to help identify potential scams.
          </p>
        </div>
      </div>

      <Link
        to="/report-suspicious-recipient"
        className="report-recipient-button"
      >
        Report Recipient
        <ArrowRight size={18} />
      </Link>
    </section>
  );
}