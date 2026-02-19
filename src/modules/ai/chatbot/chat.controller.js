const { success } = require("zod");
const { get } = require("./chat.route");
const { handleChat, getChatHistory, deleteChatHistory } = require("./chat.service");
const chatLogger = require("../../../utils/chat.logger");

function normalizeMessages(messages = []) {
  return messages.map(m => ({
    role: m.type === "human" ? "user" : "assistant",
    content: m.content,
    id: m.id,
  }));
}

// async function chat(req, res) {
//   try {
//     const user = req.user;
//     const { message } = req.body;

//     if (!user.userId || !message) {
//       return res.status(400).json({
//         error: "userId and message are required",
//       });
//     }

//     const reply = await handleChat(user, message);

//     return res.json({ reply });
//   } catch (err) {
//     console.error("Chat Controller Error:", err);
//     return res.status(500).json({
//       error: "Chatbot failed",
//       details: err.message,
//     });
//   }
// }

async function chat(req, res) {
  const start = Date.now();

  try {
    const user = req.user;
    const { message } = req.body;

    const reply = await handleChat(user, message);

    const totalLatency = Date.now() - start;

    chatLogger.info({
      event: "CHAT_API_COMPLETED",
      userId: user.userId,
      sessionId: user.sessionId,
      apiLatencyMs: totalLatency,
    });

    return res.json({ reply });

  } catch (err) {
    chatLogger.error({
      event: "CHAT_API_FAILED",
      error: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      error: "Chatbot failed",
      details: err.message,
    });
  }
}


async function chatHistory(req, res) {
  try {
    const user = req.user;
    const message = await getChatHistory(user);
    console.log("Fetched chat history:", message);
    return res.json({
      success: true,
      history: normalizeMessages(message)
    });
  }
  catch (err) {
    console.error("Error fetching chat history:", err);
    return res.status(500).json({
      error: "Failed to fetch chat history",
      details: err.message,
    });
  }
}

async function deleteHistory(req, res) {
  try {
    const result = await deleteChatHistory(req.user);

    return res.json({
      success: true,
      message: "Chat history deleted successfully",
      deletedCount: result.deleted,
    });
  } catch (error) {
    console.error("Delete chat history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete chat history",
    });
  }
}

module.exports = { chat, chatHistory, deleteHistory };
