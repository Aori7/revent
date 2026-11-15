const STORAGE_KEY = "reventScheduledTransfers";

export function getScheduledTransfers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScheduledTransfers(transfers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
}

export function addScheduledTransfer(transfer) {
  const transfers = getScheduledTransfers();

  const newTransfer = {
    ...transfer,
    id: crypto.randomUUID(),
    status: "scheduled",
    createdAt: Date.now(),
  };

  saveScheduledTransfers([...transfers, newTransfer]);

  return newTransfer;
}

export function cancelScheduledTransfer(id) {
  const transfers = getScheduledTransfers();

  const updated = transfers.map((transfer) =>
    transfer.id === id && transfer.status === "scheduled"
      ? {
          ...transfer,
          status: "cancelled",
          cancelledAt: Date.now(),
        }
      : transfer
  );

  saveScheduledTransfers(updated);

  return updated;
}

// Prototype only: changes local records, never sends money.
export function simulateDueTransfers(now = Date.now()) {
  const transfers = getScheduledTransfers();

  const updated = transfers.map((transfer) => {
    if (
      transfer.status === "scheduled" &&
      new Date(transfer.scheduledAt).getTime() <= now
    ) {
      return {
        ...transfer,
        status: "simulated",
        simulatedAt: now,
      };
    }

    return transfer;
  });

  saveScheduledTransfers(updated);

  return updated;
}
