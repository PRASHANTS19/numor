const router = require('express').Router();
const auth = require('../../../middlewares/auth.middleware');
const controller = require('./chat.controller');

router.post("/chat", auth, controller.chat);
router.get("/chat/history", auth, controller.chatHistory);
router.delete("/chat/deleteHistory", auth, controller.deleteHistory);

module.exports = router;
