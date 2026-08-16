const VALID_INTENTS = [
  "WILL_PAY",
  "CANNOT_PAY",
  "DISPUTE",
  "ALREADY_PAID",
  "CALLBACK",
  "DO_NOT_CALL",
];

export const validateCall = (req, res, next) => {
  const { customerId, intent } = req.body;

  if (!customerId) {
    return res.status(400).json({
      success: false,
      message: "customerId is required",
    });
  }

  if (typeof customerId !== "string") {
    return res.status(400).json({
      success: false,
      message: "customerId must be a string",
    });
  }

  if (!intent) {
    return res.status(400).json({
      success: false,
      message: "intent is required",
    });
  }

  if (!VALID_INTENTS.includes(intent)) {
    return res.status(400).json({
      success: false,
      message: "Invalid intent",
    });
  }

  next();
};
