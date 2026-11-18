
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Info,
  ClipboardList,
} from 'lucide-react';

import {
  DEMO_RECIPIENTS,
  REPORT_CATEGORIES,
  submitReport,
  getRecipientRisk,
  getReports,
} from '../services/suspiciousRecipientStorage';

import '../css/suspicious-recipient.css';

// Prototype only: one simulated customer per browser.
// Replace with verified user ID later.
const DEMO_REPORTER_ID = 'demo-customer-1';

export default function ReportSuspiciousRecipient() {
  const [recipientId, setRecipientId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  // Added: previously submitted reports
  const [reports, setReports] = useState(() =>
    getReports()
      .filter(r => r.reporterId === DEMO_REPORTER_ID)
      .sort((a, b) =>
        new Date(b.submittedAt) - new Date(a.submittedAt)
      )
  );

  const recipient = DEMO_RECIPIENTS.find(
    r => r.id === recipientId
  );

  // Added: refresh report history
  function refreshReports() {
    setReports(
      getReports()
        .filter(r => r.reporterId === DEMO_REPORTER_ID)
        .sort((a, b) =>
          new Date(b.submittedAt) - new Date(a.submittedAt)
        )
    );
  }

  // Original submission function, with history refresh added
  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const report = submitReport({
        reporterId: DEMO_REPORTER_ID,
        recipientId,
        category,
        description,
      });

      setSubmitted({
        report,
        recipient,
        risk: getRecipientRisk(recipientId),
      });

      // Added: update history after successful submission
      refreshReports();
    } catch (err) {
      // Keep the original inline error message
      setError(err.message || 'Unable to submit your report.');
    }
  }

  // Original reset function
  function resetForm() {
    setRecipientId('');
    setCategory('');
    setDescription('');
    setError('');
    setSubmitted(null);
  }

  // Added: display submission date
  function formatDate(date) {
    return new Date(date).toLocaleString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <main className="rr-page">
      <div className="rr-container">

        {/* ORIGINAL: Back to Dashboard */}
        <Link className="rr-back" to="/">
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>

        {/* ORIGINAL: Page Header */}
        <header className="rr-header">
          <span className="rr-eyebrow">
            <ShieldAlert size={17} /> Scam Protection
          </span>

          <h1>Report Suspicious Recipient</h1>

          <p>
            Tell us about a payment recipient who may be
            involved in suspicious activity.
          </p>
        </header>

        {submitted ? (
          /* ORIGINAL: Success Confirmation */
          <section
            className="rr-panel rr-success"
            aria-live="polite"
          >
            <CheckCircle2
              size={44}
              className="rr-success-icon"
              aria-hidden="true"
            />

            <h2>Report submitted successfully</h2>

            <p>
              Thank you for sharing your concern.
              Your report has been recorded for this prototype.
            </p>

            <dl className="rr-summary">
              <div>
                <dt>Recipient</dt>
                <dd>{submitted.recipient.name}</dd>
              </div>

              <div>
                <dt>Category</dt>
                <dd>{submitted.report.category}</dd>
              </div>

              <div>
                <dt>Report status</dt>
                <dd>
                  <span className="rr-status">
                    Pending Review
                  </span>
                </dd>
              </div>

              <div>
                <dt>Reports recorded in this browser</dt>
                <dd>{submitted.risk.count}</dd>
              </div>

              <div>
                <dt>Report reference</dt>
                <dd className="rr-reference">
                  {submitted.report.id.slice(0, 8).toUpperCase()}
                </dd>
              </div>
            </dl>

            <p className="rr-note">
              A report does not confirm that a recipient
              is a scammer or automatically prevent payments.
            </p>

            <div className="rr-actions">
              <button
                type="button"
                className="rr-button rr-button-secondary"
                onClick={resetForm}
              >
                Submit another report
              </button>

              <Link
                to="/"
                className="rr-button rr-button-primary"
              >
                Return to Dashboard
              </Link>
            </div>
          </section>
        ) : (
          /* ORIGINAL: Reporting Form */
          <form
            className="rr-panel rr-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <h2>Recipient information</h2>

            <p className="rr-muted">
              Choose the recipient you would like to report.
            </p>

            <label htmlFor="rr-recipient">
              Payment recipient <span aria-hidden="true">*</span>
            </label>

            <select
              id="rr-recipient"
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              required
            >
              <option value="">Select a recipient</option>

              {DEMO_RECIPIENTS.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.identifier}
                </option>
              ))}
            </select>

            {/* ORIGINAL: Selected Recipient Preview */}
            {recipient && (
              <div className="rr-recipient-preview">
                <strong>{recipient.name}</strong>

                <span>
                  {recipient.method} · {recipient.identifier}
                </span>

                <small>
                  Previously submitted reports:{' '}
                  {getRecipientRisk(recipient.id).count}
                </small>
              </div>
            )}

            <hr className="rr-rule" />

            <h2>Report details</h2>

            <label htmlFor="rr-category">
              Reason for reporting <span aria-hidden="true">*</span>
            </label>

            <select
              id="rr-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              <option value="">Select a category</option>

              {REPORT_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label htmlFor="rr-description">
              Additional information <span aria-hidden="true">*</span>
            </label>

            <textarea
              id="rr-description"
              rows={6}
              maxLength={1000}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what happened and why you believe this recipient is suspicious (at least 10 characters)."
              required
            />

            <div className="rr-char-count">
              {description.length}/1000 characters
            </div>

            <div className="rr-information">
              <Info size={19} aria-hidden="true" />

              <p>
                Please report only genuine concerns.
                Submitting a report does not automatically
                block the recipient.
              </p>
            </div>

            {/* ORIGINAL: Inline Error Message */}
            {error && (
              <p className="rr-error" role="alert">
                {error}
              </p>
            )}

            <div className="rr-actions">
              <Link
                className="rr-button rr-button-secondary"
                to="/"
              >
                Cancel
              </Link>

              <button
                className="rr-button rr-button-primary"
                type="submit"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}

        {/* NEW: My Submitted Reports */}
        <section
          className="rr-panel rr-history"
          aria-labelledby="rr-history-title"
        >
          <div className="rr-history-header">
            <div>
              <h2 id="rr-history-title">
                <ClipboardList size={22} />
                My Submitted Reports
              </h2>

              <p className="rr-muted">
                View your previously submitted reports
                and their current status.
              </p>
            </div>

            <span className="rr-history-count">
              {reports.length}{' '}
              {reports.length === 1 ? 'Report' : 'Reports'}
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="rr-history-empty">
              <ClipboardList size={34} />

              <h3>No reports submitted yet</h3>

              <p>
                Your submitted reports will appear here
                after you complete the reporting form.
              </p>
            </div>
          ) : (
            <div className="rr-history-list">
              {reports.map(report => {
                const reportedRecipient = DEMO_RECIPIENTS.find(
                  r => r.id === report.recipientId
                );

                return (
                  <article
                    key={report.id}
                    className="rr-history-item"
                  >
                    <div className="rr-history-item-top">
                      <div>
                        <h3>
                          {reportedRecipient?.name || 'Unknown recipient'}
                        </h3>

                        <p className="rr-history-category">
                          {report.category}
                        </p>
                      </div>

                      <span className="rr-status">
                        {report.status}
                      </span>
                    </div>

                    <p className="rr-history-description">
                      {report.description}
                    </p>

                    <div className="rr-history-footer">
                      <span>
                        Submitted: {formatDate(report.submittedAt)}
                      </span>

                      <span>
                        Ref: {report.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
