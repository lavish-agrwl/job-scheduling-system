import dotenv from "dotenv";

dotenv.config();

const requiredVariables = [
  "REDIS_HOST",
  "REDIS_PORT",
  "MONGO_URI",
  "NODE_ENV",
  "PORT",
];

const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missingVariables.join(", ")}. ` +
      "Define them in your .env file.",
  );
}

export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PORT = process.env.REDIS_PORT;
export const MONGO_URI = process.env.MONGO_URI;
export const NODE_ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT;
