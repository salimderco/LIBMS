import express, { type Express } from "express";
import cors from "cors";
// Changed to a default import to fix the callable expression error
import pinoHttp from "pino-http"; 
import router from "./routes";
import { logger } from "./lib/logger";
import type { IncomingMessage, ServerResponse } from "http";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      // Explicitly typed 'req' to fix the implicit 'any' error
      req(req: IncomingMessage & { id?: string | number }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      // Explicitly typed 'res' to fix the implicit 'any' error
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