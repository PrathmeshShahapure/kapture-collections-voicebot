import crypto from "crypto";
import { insertCall, findCallById } from "../repositories/call.repository.js";

export const createCall = async (data, decision) => {
  const call = {
    id: crypto.randomUUID(),
    customerId: data.customerId,
    intent: data.intent,
    amount: data.amount ?? null,
    escalated: decision.escalate,
    paymentDate: data.paymentDate ?? null,
    notes: data.notes ?? null,
  };

  const savedCall = await insertCall(call);

  return savedCall;
};

export const getCallById = async (callId) => {
  const call = await findCallById(callId);

  if (!call) {
    const error = new Error("Call not found");
    error.statusCode = 404;

    throw error;
  }

  return call;
};
