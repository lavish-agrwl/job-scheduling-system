import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, "../../.env");

dotenv.config({ path: envPath });

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
      `Define them in ${envPath} or export them in the shell before starting the app.`,
  );
}

export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PORT = process.env.REDIS_PORT;
export const MONGO_URI = process.env.MONGO_URI;
export const NODE_ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT;
