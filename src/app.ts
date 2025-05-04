import express from "express";
import userRoutes from "./routes/user.routes.js";

const app = express();

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://megajr-front.netlify.app"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

console.log("CORS configurado."); // Adicione este log
app.use(express.json());
app.use("/", userRoutes);
console.log("Rotas de usuário adicionadas."); // Adicione este log

export default app;
