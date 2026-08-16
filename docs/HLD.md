# Kapture Finance Collections Voicebot

## 1. Overview

This project implements **Maya**, a voice-based collections assistant for Kapture Finance.

The prototype uses Vapi for the voice conversation layer, a Node.js/Express backend for processing call outcomes, and PostgreSQL for persistent storage.

The primary goal of the implementation is to take a natural-language collections conversation and convert the important outcome into structured data that can be persisted in the backend.

### Implemented stack

* **Voice platform:** Vapi
* **Voice agent:** Maya
* **Backend:** Node.js + Express
* **Database:** PostgreSQL
* **Voice processing:** Vapi STT / LLM / TTS pipeline
* **Backend integration:** Vapi tools and end-of-call processing

---

# 2. Current System Architecture

The implemented system consists of three main layers:

```text
                    ┌──────────────────────┐
                    │      Customer        │
                    │   Voice Conversation │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Vapi / Maya     │
                    │                      │
                    │  STT → LLM → TTS    │
                    │                      │
                    │  verify_customer     │
                    │  get_customer_details│
                    │  end_call            │
                    └──────────┬───────────┘
                               │
                     End-of-call report
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Kapture Backend    │
                    │   Node.js / Express  │
                    │                      │
                    │  /api/calls/outcome  │
                    │  handleCallOutcome() │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     PostgreSQL       │
                    │                      │
                    │       calls          │
                    └──────────────────────┘
```

### Component responsibilities

#### Vapi / Maya

Vapi handles the live voice interaction.

Maya is responsible for:

* Conducting the collections conversation
* Following the configured conversation instructions
* Asking for customer verification
* Calling backend tools when customer information is required
* Understanding the customer's payment intent
* Extracting structured information from the conversation
* Ending the call through Vapi's built-in `end_call` tool

#### Kapture Backend

The backend provides the application integration layer.

It handles:

* Vapi tool requests
* End-of-call processing
* Structured-output extraction
* Combining tool results with the conversation outcome
* Persisting the final call information

#### PostgreSQL

PostgreSQL provides persistent storage for completed call information.

The `calls` table stores the structured outcome generated from the conversation.

---

# 3. Conversation Flow

The current Maya conversation follows a collections-oriented flow.

```text
START
  │
  ▼
Introduction
  │
  ▼
Purpose of the call
  │
  ▼
Customer verification
  │
  ├──────── Verification fails ────────► Appropriate call handling
  │
  ▼
Customer verified
  │
  ▼
Retrieve customer details
  │
  ▼
Collections conversation
  │
  ▼
Understand customer intent
  │
  ├── WILL_PAY
  ├── CANNOT_PAY / HARDSHIP
  ├── DISPUTE
  ├── ALREADY_PAID
  ├── CALLBACK_REQUEST
  ├── DO_NOT_CALL
  ├── WRONG_PERSON
  └── HOSTILE
  │
  ▼
Extract structured outcome
  │
  ▼
End call
  │
  ▼
Vapi end-of-call report
  │
  ▼
Backend processes outcome
  │
  ▼
PostgreSQL
```

The conversation itself happens inside Vapi. The backend processes the structured result after the call.

---

# 4. Vapi Tools

The prototype uses two custom backend tools and one Vapi built-in tool.

## 4.1 `verify_customer`

### Purpose

Verifies the customer before customer-specific information is disclosed.

### Role in conversation

Maya uses this tool when customer verification is required.

The tool returns a structured verification result that can subsequently be used by the conversation and backend processing.

The customer identifier returned by this tool is also available to the backend when processing the completed call.

---

## 4.2 `get_customer_details`

### Purpose

Retrieves customer information required by Maya after the appropriate verification step.

The tool is used to provide customer-specific information to the assistant rather than requiring the LLM to invent or infer account data.

The returned information includes customer/account information used during the collections conversation.

The backend later uses the tool result when constructing the final call record.

---

## 4.3 `end_call`

`end_call` is a built-in Vapi tool rather than a custom backend function.

It is used by Maya to terminate the conversation when the call has reached an appropriate endpoint.

The completed call then produces an end-of-call report that is consumed by the backend.

---

# 5. Authentication and Data Safety

A key requirement of the conversation is that customer-specific debt information should not be disclosed before the customer has been appropriately verified.

The current implementation handles this through the configured Maya conversation flow and the `verify_customer` tool.

The intended sequence is:

```text
Customer
   │
   ▼
Verification requested
   │
   ▼
verify_customer
   │
   ▼
Verification result
   │
   ▼
get_customer_details
   │
   ▼
Customer-specific information available
```

This separates verification from customer-detail retrieval.

### Important prototype limitation

The current take-home implementation does **not** implement a dedicated server-side authorization/state-machine layer that independently prevents every downstream operation before verification.

Therefore, the prototype relies on the configured Vapi conversation flow and tool sequence for this behaviour.

A production implementation should move this security boundary into the backend/API layer so that sensitive customer information cannot be returned solely because an LLM requested it.

---

# 6. Intent and Entity Extraction

Maya is configured to identify important collections outcomes.

### Supported intents

| Intent                    | Meaning                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| `WILL_PAY`                | Customer indicates willingness to make the payment                       |
| `CANNOT_PAY` / `HARDSHIP` | Customer indicates they cannot currently pay                             |
| `DISPUTE`                 | Customer disputes the amount or obligation                               |
| `ALREADY_PAID`            | Customer states that the payment has already been made                   |
| `CALLBACK_REQUEST`        | Customer requests a callback                                             |
| `DO_NOT_CALL`             | Customer requests no further calls                                       |
| `WRONG_PERSON`            | The person answering is not the intended customer                        |
| `HOSTILE`                 | Conversation becomes hostile or unsuitable for normal automated handling |

### Extracted fields

The structured outcome includes:

* `intent`
* `payment_date`
* `notes`

The implementation was tested with a successful payment-commitment scenario.

Example:

```text
Intent: WILL_PAY
Payment Date: next month
Notes: The customer stated they will make the payment in next month, indicating willingness to pay and providing a payment timing.
```

This structured output is subsequently processed by the backend.

---

# 7. End-of-Call Processing

One of the core parts of the implementation is the backend's end-of-call processing.

After Maya ends the conversation, the backend receives the Vapi call information through the configured outcome endpoint.

```text
Vapi
  │
  │ End-of-call information
  ▼
POST /api/calls/outcome
  │
  ▼
handleCallOutcome()
```

`handleCallOutcome` retrieves the completed Vapi call information and processes the artifacts generated during the conversation.

The backend reads the structured output containing:

```text
intent
payment_date
notes
```

It also processes relevant tool results, including information produced by:

```text
verify_customer
get_customer_details
```

The backend then combines these pieces of information to create the structured call record.

---

# 8. Backend Processing Flow

The backend processing can be represented as:

```text
Vapi completed call
        │
        ▼
/api/calls/outcome
        │
        ▼
handleCallOutcome()
        │
        ├── Retrieve Vapi call
        │
        ├── Read structured outputs
        │      ├── intent
        │      ├── payment_date
        │      └── notes
        │
        ├── Read relevant tool results
        │      ├── customerId
        │      └── customer details / amount
        │
        ▼
decideNextAction()
        │
        ▼
createCall()
        │
        ▼
PostgreSQL
```

This design allows the conversational system to produce a structured result without requiring the voice model to directly manage database persistence.

---

# 9. Database Persistence

PostgreSQL is used to persist completed call information.

The main table used by the implementation is:

```text
calls
```

The backend creates the call record after processing the completed Vapi interaction.

During development, database persistence was explicitly verified by querying individual call records using their ID.

Example:

```sql
SELECT *
FROM calls
WHERE id = '<call-id>';
```

The test confirmed that the structured outcome generated from the Vapi conversation was correctly persisted in PostgreSQL.

---

# 10. Guardrails

The voicebot is configured to operate within the intended collections context.

Important behaviours include:

### Verification before customer details

Maya should complete the verification step before retrieving customer-specific details.

### No fabricated account information

Account information should come from the backend tool rather than being invented by the LLM.

### Respectful collection behaviour

Maya should remain polite and professional and should not use threats, harassment, or abusive language.

### Already-paid handling

If the customer states that the EMI has already been paid, Maya should acknowledge the response and avoid continuing to pressure the customer as though the payment had not been made.

### Do-not-call handling

If the customer requests no further calls, Maya should respect the request and end the conversation appropriately.

### Off-topic handling

Maya should remain within the intended collections conversation and avoid making unsupported claims about account policies, penalties, or legal consequences.

---

# 11. Call Outcomes

The prototype separates the voice conversation from the final structured call outcome.

The final outcome is generated from the conversation and passed to the backend.

The backend can then persist information such as:

```text
Intent
Payment Date
Notes
Customer ID
Customer/account information
Call information
```

This makes the result useful for downstream systems without requiring a human to manually read the entire conversation.

---

# 12. Observability

The current implementation provides persistence of completed call information in PostgreSQL.

The stored call data provides a foundation for analysing conversations after they complete.

Useful metrics for a future production deployment include:

* Call completion rate
* Average call duration
* Intent distribution
* Promise-to-pay rate
* Hardship rate
* Dispute rate
* Already-paid rate
* Do-not-call rate
* Tool-call failures
* Failed verification attempts
* Average backend processing latency

Dedicated production monitoring and metrics infrastructure was not implemented in this take-home prototype.

---

# 13. Latency

The primary conversational pipeline inside Vapi is:

```text
Customer speech
      ↓
STT
      ↓
LLM
      ↓
Tool call (when required)
      ↓
LLM
      ↓
TTS
      ↓
Customer
```

The backend also participates when Maya calls `verify_customer` or `get_customer_details`.

The current implementation does not contain dedicated per-hop latency instrumentation.

For a production system, latency should be measured independently for:

* STT
* LLM response generation
* Backend tool calls
* TTS
* End-to-end response time
* End-of-call processing

---

# 14. Debugging and Validation

Development involved testing the complete integration rather than only testing individual components.

A successful `WILL_PAY` scenario was tested and produced structured information containing:

```text
Intent: WILL_PAY
Payment Date: next month
```

The backend then processed the completed Vapi call and persisted the resulting information.

The PostgreSQL record was subsequently queried directly to verify that the update had actually been stored.

This confirmed the complete path:

```text
Voice conversation
      ↓
Structured Vapi output
      ↓
Backend processing
      ↓
PostgreSQL persistence
```

---

# 15. Current Limitations

The following capabilities were **not implemented** in this prototype:

* PSTN/telephony integration
* Real outbound phone-number infrastructure
* Real payment processing
* Payment-link delivery through SMS/WhatsApp
* Live human-agent transfer
* CRM/core-lending-system integration
* Dedicated production monitoring
* Backend-enforced authentication state machine

These are intentionally documented as limitations rather than represented as implemented functionality.

---

# 16. Future Production Extensions

A production deployment could extend the current prototype with:

1. Telephony integration for real outbound calls.
2. Backend-enforced authentication state.
3. Integration with the lending/core-account system.
4. Real payment-link generation and delivery.
5. Human-agent escalation.
6. CRM synchronization.
7. Centralized monitoring and alerting.
8. Automated conversation evaluation.
9. Expanded multilingual support.
10. Automated testing across collection scenarios.

The current prototype provides the core foundation for the voice-agent → backend → database workflow while keeping the implementation small enough to validate the main technical path.

---

# 17. Summary

The implemented system demonstrates a working voice-AI collections workflow using:

**Vapi / Maya → backend tools → end-of-call processing → Node.js/Express → PostgreSQL**

The key implementation value is the conversion of a natural voice conversation into structured collection data that can be persisted and queried programmatically.

The prototype deliberately documents its current boundaries and does not represent unimplemented production integrations as completed features.
