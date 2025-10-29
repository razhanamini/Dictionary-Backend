import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL — set your Neon connection string in env");
  process.exit(1);
}

// Use the connection string and enable SSL (adjust rejectUnauthorized in production)
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
