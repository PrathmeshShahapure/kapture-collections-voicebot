import { Router } from "express";
import {
  handleCall,
  getCall,
  handleCallOutcome,
} from "../controllers/call.controller.js";
import { validateCall } from "../middleware/validateCall.js";

const router = Router();



router.post("/", validateCall, handleCall);
router.post("/outcome", handleCallOutcome);

router.get("/:id", getCall);

export default router;