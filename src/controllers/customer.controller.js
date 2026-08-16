import {
  verifyCustomer,
  getCustomerById,
} from "../services/customer.service.js";

export const verifyCustomerController = async (req, res, next) => {
  try {
    const { message } = req.body;

    const toolCall = message.toolCallList[0];

    const rawArguments = toolCall.function.arguments;

    const { accountLast4, phone } =
      typeof rawArguments === "string"
        ? JSON.parse(rawArguments)
        : rawArguments;

    const result = await verifyCustomer(phone, accountLast4);

    return res.json({
      results: [
        {
          toolCallId: toolCall.id,
          result: JSON.stringify(result),
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerController = async (req, res, next) => {
  try {
    const { message } = req.body;

    const toolCall = message.toolCallList[0];

    const rawArguments = toolCall.function.arguments;

    const { customerId } =
      typeof rawArguments === "string"
        ? JSON.parse(rawArguments)
        : rawArguments;

    const customer = await getCustomerById(customerId);

    const result = {
      name: customer.name,
      amountDue: customer.amount_due,
      dueDate: customer.due_date,
    };

    return res.json({
      results: [
        {
          toolCallId: toolCall.id,
          result: JSON.stringify(result),
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};
