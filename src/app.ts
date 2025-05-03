import express from "express";
import userRoutes from "./routes/user.routes.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "https://megajr-front-end.vercel.app",
  })
);
console.log(
  "CORS middleware configurado para https://megajr-front-end.vercel.app"
); // Adicione este log
app.use(express.json());
app.use("/", userRoutes);

export default app;
