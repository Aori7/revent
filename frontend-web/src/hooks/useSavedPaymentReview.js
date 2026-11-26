import { useEffect, useState } from "react";

import {
  getSavedPaymentReview,
} from "../services/paymentReviewApi.js";

import {
  getSavedReview,
} from "../utils/demoSession.js";

export default function useSavedPaymentReview() {
  const [saved, setSaved] = useState(null);
  const [savedError, setSavedError] = useState("");

  useEffect(() => {
    let active = true;

    const local = getSavedReview();

    getSavedPaymentReview()
      .then((server) => {
        if (active) {
          setSaved(
            server ||
              (
                local?.draft.transferType !== "ecommerce"
                  ? local
                  : null
              )
          );
        }
      })
      .catch((error) => {
        if (active) {
          setSaved(
            local?.draft.transferType !== "ecommerce"
              ? local
              : null
          );

          setSavedError(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    saved,
    savedError,
  };
}