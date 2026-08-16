import express from "express";
import callRoutes from "./routes/call.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.use("/api/calls", callRoutes);
app.use("/api/customers", customerRoutes);

app.use(errorHandler);

export default app;
