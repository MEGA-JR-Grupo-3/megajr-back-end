import express from "express";
import userRoutes from "./routes/user.routes.js";
import cors from "cors";

const preferred = "https://megajr-front.netlify.app";
const fallback = "http://localhost:3000";
const origin = preferred ?? fallback;

const app = express();

app.use(
  cors({
    origin: origin,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true,
  })
);

console.log("CORS configurado"); // Mensagem de log atualizada
app.use(express.json());
app.use("/", userRoutes);
console.log("Rotas de usuário adicionadas.");

export default app;
