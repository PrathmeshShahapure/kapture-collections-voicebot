import { pool } from "../db/index.js";

export const findCustomerById = async (customerId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM customers
      WHERE id = $1
    `,
    [customerId],
  );

  return result.rows[0] || null;
};

export const findCustomerByPhone = async (phone) => {
  const result = await pool.query(
    `
      SELECT *
      FROM customers
      WHERE phone = $1
    `,
    [phone],
  );

  return result.rows[0] || null;
};