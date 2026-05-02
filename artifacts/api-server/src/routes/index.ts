import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import booksRouter from "./books.js";
import loansRouter from "./loans.js";
import usersRouter from "./users.js";
import dashboardRouter from "./dashboard.js";
import aiRouter from "./ai.js";
import finesRouter from "./fines.js";
import notificationsRouter from "./notifications.js";
import reservationsRouter from "./reservations.js";
import reviewsRouter from "./reviews.js";
import wishlistRouter from "./wishlist.js";
import announcementsRouter from "./announcements.js";
import loanPolicyRouter from "./loan-policy.js";
import reportsRouter from "./reports.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(booksRouter);
router.use(loansRouter);
router.use(usersRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(finesRouter);
router.use(notificationsRouter);
router.use(reservationsRouter);
router.use(reviewsRouter);
router.use(wishlistRouter);
router.use(announcementsRouter);
router.use(loanPolicyRouter);
router.use(reportsRouter);

export default router;
