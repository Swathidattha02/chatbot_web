const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/auth");

// All chat routes are protected
router.post("/message", authMiddleware, chatController.sendMessage);
router.post("/stream", authMiddleware, chatController.streamMessage); // NEW: Streaming endpoint
router.get("/history", authMiddleware, chatController.getChatHistory);
router.delete("/:sessionId", authMiddleware, chatController.deleteChat);

module.exports = router;
