
import {
  useState,
  useEffect,
  useCallback,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowLeft,
  ShieldAlert,
  CalendarDays,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Info,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";

import { getScamAwarenessData } from "../../services/scamAwarenessService";

import "../../css/dashboard/scam-awareness-dashboard.css";

const CATEGORY_COLORS = {
  Impersonation: "#ed1c24",
  "Suspicious Online Seller": "#e89b35",
  "Fake Business": "#64748b",
  "Payment Fraud": "#94a3b8",
};

// Reusable summary card.
function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <article className="sa-stat-card">
      <div className="sa-stat-icon">
        <Icon size={23} aria-hidden="true" />
      </div>

      <p className="sa-stat-label">{label}</p>

      <h2 className="sa-stat-value">
        {value}
      </h2>

      <p className="sa-stat-description">
        {description}
      </p>
    </article>
  );
}

export default function ScamAwarenessDashboard() {
  const [period, setPeriod] = useState(7);

  const [data, setData] = useState(() =>
    getScamAwarenessData(7)
  );

  const [refreshMessage, setRefreshMessage] =
    useState("");

  // Retrieve the latest aggregated report data.
  const refreshData = useCallback(() => {
    setData(getScamAwarenessData(period));
  }, [period]);

  // Automatically update when reports change.
  useEffect(() => {
    refreshData();

    function handleStorage(event) {
      if (
        event.key ===
          "reventSuspiciousRecipientReportsV1" ||
        event.key === null
      ) {
        refreshData();
      }
    }

    window.addEventListener(
      "revent-reports-updated",
      refreshData
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "focus",
      refreshData
    );

    return () => {
      window.removeEventListener(
        "revent-reports-updated",
        refreshData
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "focus",
        refreshData
      );
    };
  }, [refreshData]);

  // Remove refresh message after 3 seconds.
  useEffect(() => {
    if (!refreshMessage) return;

    const timer = setTimeout(() => {
      setRefreshMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [refreshMessage]);

  function handleRefresh() {
    refreshData();
    setRefreshMessage("Dashboard is up to date.");
  }

  function handlePeriodChange(days) {
    setPeriod(days);
    setData(getScamAwarenessData(days));
  }

  // Calculate chart scale.
  const maxCount = Math.max(
    1,
    ...data.trend.map(item => item.count)
  );

  const chartMax = Math.max(
    4,
    Math.ceil(maxCount / 4) * 4
  );

  const chartTicks = [
    chartMax,
    chartMax * 0.75,
    chartMax * 0.5,
    chartMax * 0.25,
    0,
  ];

  const lastUpdated = new Date(
    data.lastUpdated
  ).toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="sa-page">
      <div className="sa-container">

        {/* Back Navigation */}
        <Link to="/" className="sa-back">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        {/* Page Header */}
        <header className="sa-header">
          <div>
            <span className="sa-eyebrow">
              <ShieldAlert size={17} />
              Scam Protection
            </span>

            <h1>Scam Awareness Dashboard</h1>

            <p>
              Stay informed about suspicious activity
              and make safer banking decisions.
            </p>
          </div>

          <button
            type="button"
            className="sa-refresh-button"
            onClick={handleRefresh}
          >
            <RefreshCw size={17} />
            Refresh Data
          </button>
        </header>

        {/* Last Updated */}
        <div className="sa-update-row">
          <span>
            Last updated: {lastUpdated}
          </span>

          <span
            className="sa-refresh-message"
            role="status"
          >
            {refreshMessage}
          </span>
        </div>

        {/* Prototype Information */}
        <div className="sa-notice">
          <Info size={20} aria-hidden="true" />

          <p>
            These statistics are based on reports
            recorded in this prototype browser.
            Reports are not confirmed scam cases.
          </p>
        </div>

        {/* Summary Cards */}
        <section
          className="sa-stats-grid"
          aria-label="Suspicious activity summary"
        >
          <SummaryCard
            icon={ShieldAlert}
            label="Total Reports"
            value={data.totalReports}
            description="All recorded suspicious activity reports"
          />

          <SummaryCard
            icon={CalendarDays}
            label="Reports in Last 7 Days"
            value={data.recentReports}
            description="Recently submitted reports"
          />

          <SummaryCard
            icon={TrendingUp}
            label="Most Reported Category"
            value={data.mostReportedCategory}
            description="Based on recorded report categories"
          />
        </section>

        {/* Insufficient Data */}
        {!data.hasData && (
          <section className="sa-empty-panel">
            <ClipboardList
              size={42}
              aria-hidden="true"
            />

            <h2>No suspicious activity reports yet</h2>

            <p>
              There is currently insufficient report
              data to display suspicious activity trends.
              Statistics will appear when reports are
              submitted.
            </p>

            <Link
              to="/report-suspicious-recipient"
              className="sa-primary-button"
            >
              Report Suspicious Recipient
            </Link>
          </section>
        )}

        {/* Charts */}
        {data.hasData && (
          <div className="sa-charts-grid">

            {/* Activity Trend Chart */}
            <section className="sa-panel">
              <div className="sa-panel-header">
                <div>
                  <h2>
                    <BarChart3 size={22} />
                    Suspicious Activity Trends
                  </h2>

                  <p>
                    Daily number of submitted reports.
                  </p>
                </div>
              </div>

              {/* Time Period Filter */}
              <div
                className="sa-period-filter"
                aria-label="Select trend period"
              >
                {[7, 14, 30].map(days => (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={period === days}
                    className={
                      period === days
                        ? "sa-period-button active"
                        : "sa-period-button"
                    }
                    onClick={() =>
                      handlePeriodChange(days)
                    }
                  >
                    {days} Days
                  </button>
                ))}
              </div>

              <div className="sa-chart-summary">
                <strong>{data.periodReports}</strong>

                <span>
                  reports in the last {period} days
                </span>
              </div>

              {data.periodReports === 0 ? (
                <div className="sa-chart-empty">
                  No reports were submitted during
                  this period.
                </div>
              ) : (
                <div className="sa-chart-scroll">
                  <div
                    className="sa-chart"
                    style={{
                      minWidth: period === 30
                        ? "850px"
                        : period === 14
                          ? "480px"
                          : "260px",
                    }}
                  >
                    {/* Y-axis */}
                    <div className="sa-y-axis">
                      {chartTicks.map(tick => (
                        <span key={tick}>{tick}</span>
                      ))}
                    </div>

                    {/* Chart Bars */}
                    <div className="sa-chart-content">
                      <div className="sa-chart-bars">
                        {data.trend.map(item => (
                          <div
                            className="sa-bar-column"
                            key={item.date}
                          >
                            <div
                              className="sa-bar"
                              style={{
                                height: `${
                                  item.count /
                                  chartMax * 100
                                }%`,
                              }}
                              title={
                                `${item.label}: ` +
                                `${item.count} reports`
                              }
                              aria-label={
                                `${item.label}: ` +
                                `${item.count} reports`
                              }
                            >
                              {item.count > 0 && (
                                <span className="sa-bar-value">
                                  {item.count}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* X-axis */}
                      <div className="sa-x-axis">
                        {data.trend.map(item => (
                          <span key={item.date}>
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="sa-chart-caption">
                Reports per day · Last {period} days
              </p>
            </section>

            {/* Category Breakdown */}
            <section className="sa-panel">
              <div className="sa-panel-header">
                <div>
                  <h2>
                    <ShieldAlert size={22} />
                    Reports by Category
                  </h2>

                  <p>
                    Breakdown of all recorded reports.
                  </p>
                </div>
              </div>

              <div className="sa-category-list">
                {data.categoryBreakdown.map(item => (
                  <div
                    className="sa-category-item"
                    key={item.category}
                  >
                    <div className="sa-category-heading">
                      <span className="sa-category-name">
                        <span
                          className="sa-category-dot"
                          style={{
                            background:
                              CATEGORY_COLORS[
                                item.category
                              ] || "#94a3b8",
                          }}
                        />

                        {item.category}
                      </span>

                      <strong>{item.count}</strong>
                    </div>

                    <div
                      className="sa-progress-track"
                      role="progressbar"
                      aria-label={item.category}
                      aria-valuenow={item.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="sa-progress-fill"
                        style={{
                          width: `${item.percentage}%`,
                          background:
                            CATEGORY_COLORS[
                              item.category
                            ] || "#94a3b8",
                        }}
                      />
                    </div>

                    <span className="sa-percentage">
                      {item.percentage}% of total reports
                    </span>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

        {/* Scam Awareness Tips */}
        <section className="sa-panel sa-safety-panel">
          <div className="sa-panel-header">
            <div>
              <h2>
                <ShieldCheck size={23} />
                Stay Safe While Banking
              </h2>

              <p>
                Protect yourself from potential scams.
              </p>
            </div>
          </div>

          <div className="sa-tips-grid">
            <article className="sa-tip">
              <span className="sa-tip-number">01</span>

              <h3>Verify before transferring</h3>

              <p>
                Confirm the recipient's identity before
                sending money, especially when receiving
                unexpected payment requests.
              </p>
            </article>

            <article className="sa-tip">
              <span className="sa-tip-number">02</span>

              <h3>Do not rush payments</h3>

              <p>
                Be cautious when someone pressures you
                to transfer money immediately.
              </p>
            </article>

            <article className="sa-tip">
              <span className="sa-tip-number">03</span>

              <h3>Report suspicious activity</h3>

              <p>
                Submit a report when you encounter a
                potentially suspicious payment recipient.
              </p>
            </article>
          </div>

          <Link
            to="/report-suspicious-recipient"
            className="sa-primary-button"
          >
            <ShieldAlert size={18} />
            Report Suspicious Recipient
          </Link>
        </section>

        {/* Privacy Notice */}
        <footer className="sa-footer">
          <ShieldCheck size={17} />

          <p>
            Report information is aggregated.
            Individual customer identities and personal
            information are not displayed on this dashboard.
          </p>
        </footer>

      </div>
    </main>
  );
}
