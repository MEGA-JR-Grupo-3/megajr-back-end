// src/firebaseAdminConfig.ts

import * as dotenv from "dotenv";
dotenv.config();
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import admin from "firebase-admin";

console.log(
  "--- DEBUG Firebase Admin SDK Initialization (VIA GOOGLE_APPLICATION_CREDENTIALS) ---"
);

const credPath = path.resolve(
  __dirname,
  "..",
  process.env.GOOGLE_APPLICATION_CREDENTIALS!
);

console.log("Caminho absoluto do JSON:", credPath);
import fs from "fs";

console.log(
  "Conteúdo lido do JSON:",
  JSON.parse(fs.readFileSync(credPath, "utf-8"))
);

try {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(fs.readFileSync(credPath, "utf-8"))
    ),
  });

  console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
  console.error(
    "ERRO CRÍTICO ao inicializar Firebase Admin SDK (VIA GOOGLE_APPLICATION_CREDENTIALS):",
    error
  );
  if (error instanceof Error) {
    console.error("Mensagem de erro específica:", error.message);
    console.error(
      "Dica: Verifique se a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS está definida e aponta para o arquivo JSON de credenciais correto."
    );
  }
  process.exit(1);
}
console.log("--- FIM DEBUG Firebase Admin SDK Initialization ---");

export { admin };
