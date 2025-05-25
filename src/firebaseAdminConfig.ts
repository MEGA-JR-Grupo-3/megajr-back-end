// src/firebaseAdminConfig.ts (crie este arquivo)
import * as admin from "firebase-admin";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountJson) {
  console.error(
    "FIREBASE_SERVICE_ACCOUNT_KEY não está definida nas variáveis de ambiente!"
  );
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin SDK:", error);
  process.exit(1);
}

export { admin };
