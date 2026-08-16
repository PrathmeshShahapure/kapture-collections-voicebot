import { pool } from "../db/index.js";

export const insertCall = async ({
  id,
  customerId,
  intent,
  escalated,
  amount,
  paymentDate,
  notes,
}) => {
  const result = await pool.query(
    `
      INSERT INTO calls (
        id,
        customer_id,
        intent,
        escalated,
        amount,
        payment_date,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [id, customerId, intent, escalated, amount, paymentDate, notes],
  );

  return result.rows[0];
};

export const findCallById = async (callId) => {
  const result = await pool.query(
    `
      SELECT
        c.*,
        cu.name,
        cu.phone,
        cu.account_number
      FROM calls c
      JOIN customers cu
        ON c.customer_id = cu.id
      WHERE c.id = $1
    `,
    [callId],
  );

  return result.rows[0] || null;
};
