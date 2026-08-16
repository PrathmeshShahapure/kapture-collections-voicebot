import { Router } from "express";
import {
  verifyCustomerController,
  getCustomerController,
} from "../controllers/customer.controller.js";

const router = Router();

router.post("/verify", verifyCustomerController);
router.post("/details", getCustomerController);

export default router;
