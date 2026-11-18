import type { ErrorRequestHandler } from "express";
import HttpError from "../utils/httpError";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = err instanceof HttpError ? err.statusCode : 500;
    const message =
        err instanceof Error ? err.message : "A server error occurred.";

    res.status(status).json({
        success: false,
        message,
        error: { message },
    });
};

export default errorHandler;