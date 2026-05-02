import express, { type Express } from "express";
import cors from "cors";
// 1. Import it as a namespace
import * as pinoHttp from "pino-http"; 
import router from "./routes";
import { logger } from "./lib/logger";
import type { IncomingMessage, ServerResponse } from "http";

const app: Express = express();

// 2. Safely extract the callable function whether it's a default export or a namespace
const pinoHttpMiddleware = (pinoHttp.default || pinoHttp) as unknown as typeof pinoHttp.default;

app.use(
  pinoHttpMiddleware({
    logger,
    serializers: {
      req(req: IncomingMessage & { id?: string | number }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;