
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  parsedReview,
  validatedAnswers,
  visibleAnswerIds,
} = require("../services/paymentReviewValidation");

const DRAFT = {
  id: "9058eb04-751a-4f09-9e15-693b97978e3e",
  version: 1,
  transferType: "ecommerce",
  recipientName: " Demo Seller ",
  recipientNumber: "9123 4567",
  amount: "50.00",
  reference: "Order 1",
};

test("normalizes payment details", () => {
  const result = parsedReview({
    draft: {
      ...DRAFT,
      customerId: "other-customer",
    },
  });

  assert.equal(
    result.payment.recipientNumber,
    "91234567"
  );

  assert.equal(
    result.payment.recipientName,
    "Demo Seller"
  );

  assert.ok(
    !("customerId" in result.payment)
  );
});

test("rejects an invalid payment amount", () => {
  assert.throws(
    () =>
      parsedReview({
        draft: {
          ...DRAFT,
          amount: -1,
        },
      }),
    /valid recipient/
  );
});

test("rejects an invalid review version", () => {
  assert.throws(
    () =>
      parsedReview({
        draft: {
          ...DRAFT,
          version: 0,
        },
      }),
    /identifier/
  );
});

test("allows partially completed answers to be saved", () => {
  const answers = validatedAnswers(
    {
      extraFee: "yes",
    },
    false
  );

  assert.equal(
    answers.extraFee,
    "yes"
  );
});

test("rejects incomplete reviews", () => {
  assert.throws(
    () =>
      validatedAnswers(
        {
          extraFee: "yes",
        },
        true
      ),
    /Answer all/
  );
});

test("requires conditional questions", () => {
  const visible = visibleAnswerIds({
    extraFee: "yes",
    source: "social",
    urgency: "yes",
  });

  assert.ok(visible.includes("disclosed"));
  assert.ok(visible.includes("reviews"));
  assert.ok(visible.includes("secrecy"));
});

test("rejects invalid answer options", () => {
  assert.throws(
    () =>
      validatedAnswers(
        {
          identity: "maybe",
        },
        false
      ),
    /Invalid answer/
  );
});

test("clears answers for hidden questions", () => {
  const answers = validatedAnswers(
    {
      source: "retailer",
      reviews: "yes",
    },
    false
  );

  assert.equal(
    answers.reviews,
    ""
  );
});
