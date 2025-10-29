import express, { Request, Response } from "express";
import { pool } from "./database/db";
import dotenv from "dotenv";
import cors from "cors";

const app = express();
dotenv.config();
app.use(express.json());
app.use(cors()); // Enable CORS

// POST /word
app.post("/word", async (req: Request, res: Response) => {
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: "Word is required" });
  }

  try {
    const exactQuery = `
      SELECT *
      FROM words
      WHERE LOWER(TRIM(entry)) = LOWER(TRIM($1))
    `;
    const exactResult = await pool.query(exactQuery, [word]);

    const suggestionsQuery = `
      SELECT TRIM(entry) AS entry
      FROM words
      WHERE (
        LOWER(TRIM(entry)) LIKE LOWER(TRIM($1)) || '%'
        OR LOWER(TRIM(entry)) LIKE '%' || LOWER(TRIM($1)) || '%'
      )
      GROUP BY entry
      ORDER BY
        CASE
          WHEN LOWER(TRIM(entry)) = LOWER(TRIM($1)) THEN 0
          WHEN LOWER(TRIM(entry)) LIKE LOWER(TRIM($1)) || '%' THEN 1
          WHEN LOWER(TRIM(entry)) LIKE '%' || LOWER(TRIM($1)) || '%' THEN 2
          ELSE 3
        END,
        LENGTH(TRIM(entry)) ASC
      LIMIT 15
    `;
    const suggestionsResult = await pool.query(suggestionsQuery, [word]);

    const exactFound = exactResult.rows.length > 0;

    return res.json({
      exact: {
        found: exactFound,
        data: exactResult.rows,
      },
      suggestions: suggestionsResult.rows
        .map((r) => r.entry)
        .filter(
          (e) =>
            e &&
            e.toLowerCase().trim() !== String(word).toLowerCase().trim()
        ),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /word-of-the-day
app.get("/word-of-the-day", async (_req: Request, res: Response) => {
  try {
    // Use a deterministic daily word using the current date
    const today = new Date();
    const dayOfYear = Math.floor(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(today.getFullYear(), 0, 0)) /
        24 /
        60 /
        60 /
        1000
    );

    // Pick one word based on dayOfYear modulus total words count
    const countResult = await pool.query("SELECT COUNT(*) FROM words");
    const totalWords = parseInt(countResult.rows[0].count, 10);
    const offset = dayOfYear % totalWords;

    const wordResult = await pool.query(
      `SELECT * FROM words OFFSET $1 LIMIT 1`,
      [offset]
    );

    if (wordResult.rows.length === 0) {
      return res.status(404).json({ error: "No words found" });
    }

    const wordData = wordResult.rows[0];
    return res.json(wordData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  try {
    // Optionally, you could also ping the DB here
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(500).json({ status: "error", message: "Backend unavailable" });
  }
});

// Replace immediate listen with a DB probe first
async function startServer() {
  try {
    // Probe DB connection using the shared pool
    await pool.query("SELECT 1");
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("Failed to connect to DB:", err);
    process.exit(1);
  }
}

startServer();
