import { useCallback } from "react";
import { useSimulator } from "../context/SimulatorContext";
import { assessTransactionRisk } from "../utils/riskAssessment";

export default function useTransactionRisk() {
  const { triggers } = useSimulator();

  const assess = useCallback(
    (transaction, additionalContext = {}) =>
      assessTransactionRisk(transaction, {
        ...triggers,
        ...additionalContext,
      }),
    [triggers]
  );

  return { assess };
}