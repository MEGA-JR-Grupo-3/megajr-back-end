const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Servidor Express Simples Rodando!");
});

app.listen(port, () => {
  console.log(`Servidor simples rodando na porta ${port}`);
});
