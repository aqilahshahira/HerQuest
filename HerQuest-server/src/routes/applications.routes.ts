import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware";
import * as applicationsController from "../controllers/applications.controller";

const router = Router();

router.post("/", isAuthenticated, applicationsController.create);
router.get("/mine", isAuthenticated, applicationsController.listMine);
router.patch("/:id/status", isAuthenticated, applicationsController.updateStatus);

export default router;
