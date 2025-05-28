// src/app.ts

import express from "express";
import userRoutes from "./routes/user.routes.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: "*", // ou "https://megajr-front.netlify.app",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true,
  })
);

console.log("CORS configurado");
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
console.log("Servindo arquivos estáticos de /uploads.");

app.use("/api", userRoutes);
console.log("Rotas de usuário adicionadas sob o prefixo /api.");

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada. Verifique a URL." });
});

export default app;
