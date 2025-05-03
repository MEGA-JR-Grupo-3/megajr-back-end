import express from "express";
import userRoutes from "./routes/user.routes.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin:
      "https://megajr-front-end-git-main-enzo-valencuelas-projects.vercel.app//",
  })
);
app.use(express.json());
app.use("/", userRoutes);

export default app;
