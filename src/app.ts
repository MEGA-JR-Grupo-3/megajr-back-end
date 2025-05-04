import express from "express";
import userRoutes from "./routes/user.routes.js";
import cors from "cors";

const app = express();

app.use((req, res, next) => {
  console.log(`Recebida requisição: ${req.method} ${req.url}`);
  next();
});

console.log("Configurando CORS..."); // Adicione este log
app.use(
  cors({
    origin: "*", // Permite todas as origens (NÃO USAR EM PRODUÇÃO!)
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Se precisar de cookies em cross-origin
    allowedHeaders: "Content-Type, Authorization",
  })
);
console.log("CORS configurado."); // Adicione este log
app.use(express.json());
app.use("/", userRoutes);
console.log("Rotas de usuário adicionadas."); // Adicione este log

export default app;
