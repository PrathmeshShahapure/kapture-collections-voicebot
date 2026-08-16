const VALID_INTENTS = [
  "WILL_PAY",
  "CANNOT_PAY",
  "DISPUTE",
  "ALREADY_PAID",
  "CALLBACK",
  "DO_NOT_CALL",
];

export const decideNextAction = (intent) => {
  if (!VALID_INTENTS.includes(intent)) {
    return {
      action: "INVALID_INTENT",
      escalate: true,
    };
  }

  switch (intent) {
    case "WILL_PAY":
      return {
        action: "CONTINUE_PAYMENT_WORKFLOW",
        escalate: false,
      };

    case "CANNOT_PAY":
      return {
        action: "ESCALATE_TO_HUMAN",
        escalate: true,
      };

    case "DISPUTE":
      return {
        action: "ESCALATE_TO_HUMAN",
        escalate: true,
      };

    case "ALREADY_PAID":
      return {
        action: "VERIFY_PAYMENT",
        escalate: false,
      };

    case "CALLBACK":
      return {
        action: "SCHEDULE_CALLBACK",
        escalate: false,
      };

    case "DO_NOT_CALL":
      return {
        action: "STOP_CONTACT",
        escalate: false,
      };
  }
};
