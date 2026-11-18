import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";
import questsRoutes from "./routes/quests.routes";
import applicationsRoutes from "./routes/applications.routes";
import notFound from "./middleware/notFound.middleware";
import errorHandler from "./middleware/error.middleware";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL?.split(",").map((value) => value.trim()) || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
    res.json({ success: true, status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/quests", questsRoutes);
app.use("/api/applications", applicationsRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
    console.log(`HerQuest server listening on http://localhost:${port}`);
});
