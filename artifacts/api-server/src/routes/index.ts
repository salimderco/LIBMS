import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import booksRouter from "./books.js";
import loansRouter from "./loans.js";
import usersRouter from "./users.js";
import dashboardRouter from "./dashboard.js";
import aiRouter from "./ai.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(booksRouter);
router.use(loansRouter);
router.use(usersRouter);
router.use(dashboardRouter);
router.use(aiRouter);

export default router;
