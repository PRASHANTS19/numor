const winston = require("winston");
const path = require("path");

const chatLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) =>
      JSON.stringify({ timestamp, level, ...message })
    )
  ),
  transports: [
    // All chatbot logs
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/chatbot.log"),
    }),

    // Only errors
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/chatbot-error.log"),
      level: "error",
    }),
  ],
});

module.exports = chatLogger;
