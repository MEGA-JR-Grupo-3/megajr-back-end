// Importa o módulo express
const express = require("express");

// Cria uma instância do aplicativo express
const app = express();

// Define a porta em que o servidor irá rodar
const port = 3000;

// Define uma rota básica para a página inicial
app.get("/", (req, res) => {
  res.send("Olá Mundo!");
});

// Inicia o servidor e o faz escutar na porta definida
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
