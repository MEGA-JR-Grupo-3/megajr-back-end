import express from "express";
import userRoutes from "./routes/user.routes.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "*", //"https://megajr-front.netlify.app",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true,
  })
);

console.log("CORS configurado");
app.use(express.json());
app.use("/", userRoutes);
console.log("Rotas de usuário adicionadas.");

export default app;
