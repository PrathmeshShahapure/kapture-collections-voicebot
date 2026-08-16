import axios from "axios";
import { configDotenv } from "dotenv";
import { createCall, getCallById } from "../services/call.service.js";
import { decideNextAction } from "../services/decision.service.js";
import { getCustomerById } from "../services/customer.service.js";

export const handleCall = async (req, res) => {
  const customer = await getCustomerById(req.body.customerId);

  const decision = decideNextAction(req.body.intent);

  const call = await createCall(req.body, decision);

  return res.status(201).json({
    success: true,
    customer,
    call,
    decision,
  });
};

export const getCall = async (req, res) => {
  console.log(req.params.id);
  const call = await getCallById(req.params.id);

  return res.status(200).json({
    success: true,
    call,
  });
};

export const handleCallOutcome = async (req, res, next) => {
  try {
    // 1. Get the Vapi call ID from the end-of-call webhook
    const callId = req.body.message.call.id;

    // 2. Get the completed call from Vapi
    const response = await axios.get(`https://api.vapi.ai/call/${callId}`, {
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      },
    });

    const vapiCall = response.data;

    // 3. Get the structured output
    const structuredOutputs = vapiCall.artifact?.structuredOutputs;

    const outputId = Object.keys(structuredOutputs || {})[0];

    if (!outputId) {
      throw new Error("Structured output not found");
    }

    const result = structuredOutputs[outputId].result;

    const intent = result.intent.trim();
    const paymentDate = result.payment_date || null;
    const notes = result.notes || null;

    // 4. Extract customerId and amount from tool results
    const messages = vapiCall.artifact?.messages || [];

    let customerId = null;
    let amount = null;

    for (const message of messages) {
      if (
        message.role === "tool_call_result" &&
        message.name === "verify_customer"
      ) {
        const toolResult = JSON.parse(message.result);

        if (toolResult.verified) {
          customerId = toolResult.customerId;
        }
      }

      if (
        message.role === "tool_call_result" &&
        message.name === "get_customer_details"
      ) {
        const toolResult = JSON.parse(message.result);

        amount = toolResult.amountDue;
      }
    }

    // 5. Make sure we have the required data
    if (!customerId) {
      throw new Error("Customer ID not found in call");
    }

    if (amount === null) {
      throw new Error("Customer amount not found in call");
    }

    // 6. Decide whether this call needs escalation
    const decision = decideNextAction(intent);

    // 7. Save the call using our existing service
    const call = await createCall(
      {
        customerId,
        intent,
        amount,
        paymentDate,
        notes,
      },
      decision,
    );

    // 8. Tell Vapi we successfully processed the webhook
    return res.status(200).json({
      success: true,
      call,
    });
  } catch (error) {
    next(error);
  }
};