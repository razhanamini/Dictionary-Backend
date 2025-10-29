import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString ="postgresql://neondb_owner:npg_s4xKJM6ZXhUj@ep-frosty-frog-a46vupba-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
if (!connectionString) {
  console.error("Missing DATABASE_URL — set your Neon connection string in env");
  process.exit(1);
}

// Use the connection string and enable SSL (adjust rejectUnauthorized in production)
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
// comenting