
const STORAGE_KEY = "reventSuspiciousRecipientReportsV1";

export const REPORT_THRESHOLD = 3;

export const REPORT_CATEGORIES = [
  "Impersonation",
  "Suspicious Online Seller",
  "Fake Business",
  "Payment Fraud",
];

export const DEMO_RECIPIENTS = [
  {
    id: "demo-recipient-1",
    name: "Sarah Tan",
    identifier: "9123 4567",
    method: "PayNow",
  },
  {
    id: "demo-recipient-2",
    name: "Bright Deals Shop",
    identifier: "202400001A",
    method: "UEN",
  },
  {
    id: "demo-recipient-3",
    name: "Alex Lim",
    identifier: "9234 5678",
    method: "PayNow",
  },
];

// Normalize text for comparison.
export function normalize(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Retrieve all reports stored in this browser.
export function getReports() {
  try {
    const savedReports = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(savedReports || "[]");

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Count reports for a particular recipient.
export function getReportCount(recipientId) {
  return getReports().filter(
    (report) => report.recipientId === recipientId
  ).length;
}

// Determine whether a recipient meets the warning threshold.
export function getRecipientRisk(recipientId) {
  const count = getReportCount(recipientId);

  return {
    count,
    showWarning: count >= REPORT_THRESHOLD,
    threshold: REPORT_THRESHOLD,
  };
}

// Submit a new suspicious recipient report.
export function submitReport({
  reporterId,
  recipientId,
  category,
  description,
}) {
  // Validate recipient.
  const recipientExists = DEMO_RECIPIENTS.some(
    (recipient) => recipient.id === recipientId
  );

  if (!reporterId || !recipientId || !recipientExists) {
    throw new Error("Please select a valid recipient.");
  }

  // Validate category.
  if (!REPORT_CATEGORIES.includes(category)) {
    throw new Error("Please select a report category.");
  }

  // Validate description.
  const cleanDescription = String(description ?? "").trim();

  if (
    cleanDescription.length < 10 ||
    cleanDescription.length > 1000
  ) {
    throw new Error(
      "Please provide between 10 and 1000 characters of additional information."
    );
  }

  // Retrieve previously submitted reports.
  const reports = getReports();

  // Prevent the same customer from submitting another
  // report for the same recipient under the same category.
  const duplicate = reports.some(
    (report) =>
      report.reporterId === reporterId &&
      report.recipientId === recipientId &&
      report.category === category
  );

  if (duplicate) {
    throw new Error(
      "You have already reported this recipient under this category. No additional report has been submitted."
    );
  }

  // Create a new report.
  const newReport = {
    id: crypto.randomUUID(),
    reporterId,
    recipientId,
    category,
    description: cleanDescription,
    status: "Pending Review",
    submittedAt: new Date().toISOString(),
  };

  // Save the report to localStorage.
  const updatedReports = [...reports, newReport];

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedReports)
  );

  // Notify other components in this browser.
  window.dispatchEvent(
    new Event("revent-reports-updated")
  );

  return newReport;
}
