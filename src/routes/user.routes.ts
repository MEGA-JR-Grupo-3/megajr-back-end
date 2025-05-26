import {
  getUsers,
  createUser,
  checkUserExists,
  handleGoogleLogin,
  getUserData,
  updateUserProfilePhoto,
  updateUserEmail,
  deleteUserData,
} from "../controllers/user.controller.js";

import {
  searchTasks,
  getTasksByUser,
  addTask,
  deleteTask,
  updateTaskStatus,
  updateTask,
  reorderTasks,
  deleteAllCompletedTasks,
} from "../controllers/task.controller.js";
import { Router } from "express";
import { authenticateFirebaseToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/users", authenticateFirebaseToken, getUsers);
router.get("/check-user-exists", checkUserExists);
router.post("/register", authenticateFirebaseToken, createUser);
router.post("/google-login", authenticateFirebaseToken, handleGoogleLogin);
router.post("/user-data", authenticateFirebaseToken, getUserData);

// --- EDITAR USUÁRIO -----------------------------------------------------------------------------------------------
router.post(
  "/update-profile-photo",
  authenticateFirebaseToken,
  updateUserProfilePhoto
);
router.post("/update-email", authenticateFirebaseToken, updateUserEmail);
router.delete("/delete-user-data", authenticateFirebaseToken, deleteUserData);

// --- ROTAS DAS TAREFAS --------------------------------------------------------------------------------------------

router.post("/tasks/search", authenticateFirebaseToken, searchTasks);
router.post("/tasks/add", authenticateFirebaseToken, addTask);
router.get("/tasks", authenticateFirebaseToken, getTasksByUser);
router.put("/tasks/reorder", authenticateFirebaseToken, reorderTasks);
router.delete(
  "/tasks/delete-completed",
  authenticateFirebaseToken,
  deleteAllCompletedTasks
);
router.put(
  "/tasks/:id_tarefa/status",
  authenticateFirebaseToken,
  updateTaskStatus
);
router.put("/tasks/:id_tarefa", authenticateFirebaseToken, updateTask);
router.delete("/tasks/:id_tarefa", authenticateFirebaseToken, deleteTask);

export default router;
