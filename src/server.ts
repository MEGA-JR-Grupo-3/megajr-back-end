import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.DB_PORT || 8800;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
