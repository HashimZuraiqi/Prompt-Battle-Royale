import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roomsRouter from "./game/rooms";
import playersRouter from "./game/players";
import roundsRouter from "./game/rounds";
import submissionsRouter from "./game/submissions";
import leaderboardRouter from "./game/leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roomsRouter);
router.use(playersRouter);
router.use(roundsRouter);
router.use(submissionsRouter);
router.use(leaderboardRouter);

export default router;
