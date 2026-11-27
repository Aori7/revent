
import {
  getReports,
  REPORT_CATEGORIES,
} from "./suspiciousRecipientStorage";

// ==========================================
// CONFIGURATION
// ==========================================

export const SCAM_TREND_THRESHOLD = 6;

const SCAM_AWARENESS_MESSAGES = {
  Impersonation: {
    headline: "Is that really your mother?",
    message: "Impersonation scam reports are on the rise.",
    advice: "Call your loved ones directly before sending money.",
  },

  "Suspicious Online Seller": {
    headline: "Is that deal too good to be true?",
    message: "Suspicious online seller reports are increasing.",
    advice: "Verify the seller before making an online payment.",
  },

  "Fake Business": {
    headline: "Does that business really exist?",
    message: "Fake business reports are on the rise.",
    advice: "Check the business's legitimacy before transferring money.",
  },

  "Payment Fraud": {
    headline: "Do you really need to pay now?",
    message: "Payment fraud reports are increasing.",
    advice: "Never let someone pressure you into making a payment.",
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getDateKey(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodStart(days, now) {
  const start = new Date(now);

  start.setHours(0, 0, 0, 0);

  start.setDate(
    start.getDate() - (days - 1)
  );

  return start;
}

function getValidReports(now) {
  return getReports()
    .filter(
      report =>
        report &&
        report.submittedAt &&
        REPORT_CATEGORIES.includes(report.category)
    )
    .map(report => ({
      category: report.category,
      submittedAt: new Date(report.submittedAt),
    }))
    .filter(
      report =>
        !Number.isNaN(report.submittedAt.getTime()) &&
        report.submittedAt <= now
    );
}

// ==========================================
// FEATURE 1: SCAM AWARENESS DASHBOARD
// ==========================================

export function getScamAwarenessData(days = 7) {
  const selectedDays = [7, 14, 30].includes(days)
    ? days
    : 7;

  const now = new Date();

  const reports = getValidReports(now);

  // Total reports
  const totalReports = reports.length;

  // Reports within the last 7 days
  const recentStart = getPeriodStart(7, now);

  const recentReports = reports.filter(
    report => report.submittedAt >= recentStart
  ).length;

  // Group reports by category
  const categoryBreakdown = REPORT_CATEGORIES.map(
    category => {
      const count = reports.filter(
        report => report.category === category
      ).length;

      return {
        category,
        count,
        percentage:
          totalReports > 0
            ? Math.round((count / totalReports) * 100)
            : 0,
      };
    }
  ).sort((a, b) => b.count - a.count);

  // Identify most reported category
  const highestCount =
    categoryBreakdown[0]?.count || 0;

  const topCategories =
    highestCount > 0
      ? categoryBreakdown.filter(
          item => item.count === highestCount
        )
      : [];

  const mostReportedCategory =
    topCategories.length > 0
      ? topCategories
          .map(item => item.category)
          .join(", ")
      : "No reports yet";

  // Filter reports by selected period
  const periodStart = getPeriodStart(
    selectedDays,
    now
  );

  const periodReports = reports.filter(
    report => report.submittedAt >= periodStart
  );

  // Generate daily trend data
  const trend = [];

  for (let i = selectedDays - 1; i >= 0; i--) {
    const date = new Date(now);

    date.setHours(0, 0, 0, 0);

    date.setDate(date.getDate() - i);

    const dateKey = getDateKey(date);

    const count = periodReports.filter(
      report =>
        getDateKey(report.submittedAt) === dateKey
    ).length;

    trend.push({
      date: dateKey,

      label: date.toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
      }),

      count,
    });
  }

  return {
    totalReports,
    recentReports,
    mostReportedCategory,
    categoryBreakdown,
    trend,
    periodReports: periodReports.length,
    hasData: totalReports > 0,
    lastUpdated: now.toISOString(),
  };
}

// ==========================================
// FEATURE 2: SCAM AWARENESS BUBBLE
// ==========================================


export function getRisingScamTrend() {
  const now = new Date();

  const currentStart = getPeriodStart(7, now);
  const previousStart = getPeriodStart(14, now);

  const reports = getValidReports(now);

  const categoryTrends = REPORT_CATEGORIES.map(
    (category) => {
      const currentCount = reports.filter(
        (report) =>
          report.category === category &&
          report.submittedAt >= currentStart
      ).length;

      const previousCount = reports.filter(
        (report) =>
          report.category === category &&
          report.submittedAt >= previousStart &&
          report.submittedAt < currentStart
      ).length;

      return {
        category,
        currentCount,
        previousCount,
        increase: currentCount - previousCount,
      };
    }
  );

  // Only highlight categories with more than 5 reports.
  const eligibleCategories = categoryTrends.filter(
    (item) =>
      item.currentCount >= SCAM_TREND_THRESHOLD
  );

  // Prioritise increasing scam categories.
  const risingCategories = eligibleCategories
    .filter((item) => item.increase > 0)
    .sort(
      (a, b) =>
        b.increase - a.increase ||
        b.currentCount - a.currentCount
    );

  // Otherwise, highlight the most reported category.
  const reportedCategories = [...eligibleCategories]
    .sort(
      (a, b) => b.currentCount - a.currentCount
    );

  const topTrend =
    risingCategories[0] || reportedCategories[0];

  // Display a simple banner below the threshold.
  if (!topTrend) {
    return {
      showAlert: false,
      isRising: false,
      hasReports: reports.some(
        (report) => report.submittedAt >= currentStart
      ),
      category: null,
      headline: "Think twice before you transfer.",
      message: "A moment of doubt could save your money.",
      advice: "Always verify unexpected payment requests.",
      currentCount: 0,
      previousCount: 0,
      increase: 0,
    };
  }

  const isRising = topTrend.increase > 0;

  const awarenessMessage =
    SCAM_AWARENESS_MESSAGES[topTrend.category];

  return {
    ...topTrend,
    ...awarenessMessage,

    showAlert: true,
    hasReports: true,
    isRising,

    message: isRising
      ? awarenessMessage.message
      : `${topTrend.category} reports received recently.`,
  };
}


