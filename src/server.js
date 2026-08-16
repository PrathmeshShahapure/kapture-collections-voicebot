import "dotenv/config";
import app from "./app.js";
import { pool } from "./db/index.js";

const PORT = process.env.PORT ;

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Kapture backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

startServer();
