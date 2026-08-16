# Kapture Finance Collections Voicebot

An AI-powered voice collections prototype built for the Kapture AI Delivery Intern take-home assignment.

The project uses **Vapi** to run the voice agent "Maya", a **Node.js/Express backend** for processing call outcomes, and **PostgreSQL** for storing structured call information.

The main objective of the prototype is to convert a natural-language collections conversation into structured data that can be processed and persisted by the backend.

---

## Architecture

```text
Customer
   │
   ▼
┌──────────────────────┐
│      Vapi / Maya     │
│                      │
│   STT → LLM → TTS   │
│                      │
│ verify_customer      │
│ get_customer_details │
│ end_call             │
└──────────┬───────────┘
           │
           │ End-of-call report
           ▼
┌──────────────────────────┐
│    Kapture Backend       │
│    Node.js / Express     │
│                          │
│ POST /api/calls/outcome  │
│ handleCallOutcome()      │
│ decideNextAction()       │
│ createCall()             │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       PostgreSQL         │
│                          │
│         calls            │
└──────────────────────────┘
```

For the detailed design, see [`docs/HLD.md`](docs/HLD.md).

Architecture diagram:

[`docs/architecture-diagram.png`](docs/architecture-diagram.png)

---

## Tech Stack

### Voice Agent

* Vapi
* Maya voice assistant
* Configured LLM
* Configured speech-to-text transcriber
* Configured text-to-speech voice

### Backend

* Node.js
* Express.js
* Vapi API integration

### Database

* PostgreSQL

---

## How It Works

The system has two main phases.

### 1. Voice conversation

Maya conducts the conversation inside Vapi.

The assistant can use:

* `verify_customer`
* `get_customer_details`
* Vapi's built-in `end_call`

The customer conversation is used to determine the collection outcome and extract structured information.

### 2. Post-call processing

After the call ends, Vapi provides the completed call information.

The backend receives the outcome through:

```text
POST /api/calls/outcome
```

The `handleCallOutcome` function processes the completed call.

It reads structured outputs such as:

```text
intent
payment_date
notes
```

It also reads relevant tool results such as the customer ID and customer/account information.

The backend then processes the result and persists the call record in PostgreSQL.

The flow is:

```text
Vapi completed call
        ↓
POST /api/calls/outcome
        ↓
handleCallOutcome()
        ↓
Structured outputs + tool results
        ↓
decideNextAction()
        ↓
createCall()
        ↓
PostgreSQL
```

---

## Vapi Tools

### `verify_customer`

Verifies the customer using the last four digits of the account number.

Input:

```json
{
  "accountLast4": "1234"
}
```

The value must contain exactly four digits, including leading zeros when applicable.

### `get_customer_details`

Retrieves customer details using the `customerId` returned after successful verification.

Input:

```json
{
  "customerId": "customer-id"
}
```

### `end_call`

`end_call` is a built-in Vapi tool used to terminate the conversation.

It is not a custom backend function in this project.

The complete custom tool schemas are available in:

[`vapi/tool-schemas.json`](vapi/tool-schemas.json)

The exact system prompt used by Maya is available in:

[`vapi/system-prompt.txt`](vapi/system-prompt.txt)

---

## Structured Outcome

The voicebot is configured to extract structured collection information.

The primary fields are:

```text
intent
payment_date
notes
```

A successful test produced:

```text
Intent: WILL_PAY
Payment Date: next month
Notes: The customer stated they will make the payment in next month, indicating willingness to pay and providing a payment timing.
```

This structured result is then processed by the backend and persisted in PostgreSQL.

---

## Database

The primary table used for call persistence is:

```text
calls
```

### Columns

| Column         | Type          | Constraints           |
| -------------- | ------------- | --------------------- |
| `id`           | UUID          | Primary Key           |
| `customer_id`  | UUID          | NOT NULL, Foreign Key |
| `intent`       | VARCHAR(30)   | NOT NULL              |
| `escalated`    | BOOLEAN       | Default `false`       |
| `amount`       | NUMERIC(10,2) | Optional              |
| `payment_date` | VARCHAR(100)  | Optional              |
| `notes`        | TEXT          | Optional              |

`customer_id` references:

```text
customers.id
```

A call record can be verified directly with:

```sql
SELECT *
FROM calls
WHERE id = '<call-id>';
```

---

## Authentication Flow

Maya is instructed to verify the customer before retrieving customer-specific information.

The intended flow is:

```text
Customer
   ↓
verify_customer
   ↓
Verification successful
   ↓
get_customer_details
   ↓
Customer details available to Maya
```

The current prototype primarily enforces this sequence through the Vapi assistant's configured conversation and tool flow.

A production implementation should additionally enforce authentication state at the backend/API layer so that sensitive customer information cannot be returned simply because an LLM requests it.

---

## Collection Intents

The assistant is designed to identify collection outcomes including:

* `WILL_PAY`
* `CANNOT_PAY`
* `HARDSHIP`
* `DISPUTE`
* `ALREADY_PAID`
* `CALLBACK_REQUEST`
* `DO_NOT_CALL`
* `WRONG_PERSON`
* `HOSTILE`

The prototype focuses on converting the conversation into structured outcome data rather than implementing every downstream collection operation.

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd kapture-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file containing the required backend configuration.

Do not commit secrets or API keys to the repository.

### 4. Start PostgreSQL

Ensure the PostgreSQL database is running and the required schema is available.

### 5. Start the backend

Use the project's configured start command.

### 6. Configure Vapi

The Vapi assistant must be configured with:

* Maya's system prompt
* Configured model
* Configured voice
* Configured transcriber
* `verify_customer`
* `get_customer_details`
* Vapi's built-in `end_call`
* Backend outcome endpoint

The exact prompt and custom tool schemas are included in the `vapi/` directory.

---

## Testing

The main end-to-end test performed during development was a successful promise-to-pay conversation.

Example:

```text
Customer indicates willingness to pay next month
            ↓
Maya identifies WILL_PAY
            ↓
Payment date extracted
            ↓
Vapi structured output generated
            ↓
Backend processes call outcome
            ↓
PostgreSQL call record updated
```

The database was then queried directly using the call ID to verify that the information had been persisted correctly.

---

## Debugging

One of the important debugging steps was verifying whether the backend was actually updating PostgreSQL correctly.

Instead of relying only on the application response, the resulting call was queried directly:

```sql
SELECT *
FROM calls
WHERE id = '<call-id>';
```

This confirmed that the call record existed and that the structured outcome was being persisted.

This helped separate application-level inspection issues from actual database persistence problems.

---

## Current Limitations

This repository documents the implementation that was actually built for the take-home prototype.

The following were **not implemented**:

* PSTN/telephony integration
* Real outbound phone-number integration
* Real payment processing
* SMS/WhatsApp payment-link delivery
* Live human-agent transfer
* CRM/core-lending-system integration
* Dedicated production monitoring
* Backend-enforced authentication state machine

These are intentionally listed as limitations rather than being represented as completed functionality.

---

## Future Improvements

With additional development time, the prototype could be extended with:

1. Production telephony integration.
2. Backend-enforced authentication state.
3. Integration with a real lending/account system.
4. Human-agent escalation.
5. Payment-link generation and delivery.
6. CRM synchronization.
7. Production observability and alerting.
8. Automated conversation evaluation.
9. Expanded multilingual support.
10. Broader automated test coverage.

---

## Project Structure

```text
kapture-backend/
│
├── docs/
│   ├── HLD.md
│   └── architecture-diagram.png
│
├── vapi/
│   ├── system-prompt.txt
│   └── tool-schemas.json
│
├── src/
│   └── ...
│
├── README.md
└── package.json
```

---

## Call Demo

> https://www.youtube.com/watch?v=O3-ScCQRu80


---

## Submission Notes

This project intentionally focuses on the parts implemented during the take-home:

**Vapi/Maya → backend tools → end-of-call processing → PostgreSQL**
