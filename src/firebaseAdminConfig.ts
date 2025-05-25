// src/firebaseAdminConfig.ts

import * as dotenv from "dotenv";
dotenv.config(); // Carrega as variáveis do .env (localmente)

import admin from "firebase-admin"; // Certifique-se que esta importação está correta para seu TSConfig

console.log("--- DEBUG Firebase Admin SDK Initialization ---");

try {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "Variável de ambiente GOOGLE_APPLICATION_CREDENTIALS não definida."
    );
  }

  const serviceAccountConfig = JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountConfig),
  });

  console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
  console.error("ERRO CRÍTICO ao inicializar Firebase Admin SDK:", error);
  if (error instanceof Error) {
    console.error("Mensagem de erro específica:", error.message);
    console.error(
      "Dica: Certifique-se de que GOOGLE_APPLICATION_CREDENTIALS contém o JSON COMPLETO da sua chave de serviço."
    );
  }
  process.exit(1);
}
console.log("--- FIM DEBUG Firebase Admin SDK Initialization ---");

export { admin };
