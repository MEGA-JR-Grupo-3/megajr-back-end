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
    origin: "https://megajr-front.netlify.app",
  })
);
console.log("CORS configurado."); // Adicione este log
app.use(express.json());
app.use("/", userRoutes);
console.log("Rotas de usuário adicionadas."); // Adicione este log

export default app;
