const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const logFormat = winston.format.printf(
  ({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  }
);

function createLogger(logFolder, fileName) {
  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      logFormat
    ),
    transports: [
      new DailyRotateFile({
        dirname: path.join(__dirname, "..", "logs", logFolder),
        filename: `${fileName}-%DATE%.txt`,
        datePattern: "YYYY-MM-DD",
        maxSize: "10m",
        maxFiles: "14d",
      }),
    ],
  });
}

const chatbotLogger = createLogger("chatbot", "chatbot");
const appLogger = createLogger("app", "app");

module.exports = {
  chatbotLogger,
  appLogger,
};
