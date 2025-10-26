"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./database/db");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)()); // Enable CORS
// POST /word
app.post("/word", async (req, res) => {
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
        const exactResult = await db_1.pool.query(exactQuery, [word]);
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
        const suggestionsResult = await db_1.pool.query(suggestionsQuery, [word]);
        const exactFound = exactResult.rows.length > 0;
        return res.json({
            exact: {
                found: exactFound,
                data: exactResult.rows,
            },
            suggestions: suggestionsResult.rows
                .map((r) => r.entry)
                .filter((e) => e &&
                e.toLowerCase().trim() !== String(word).toLowerCase().trim()),
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
// GET /word-of-the-day
app.get("/word-of-the-day", async (_req, res) => {
    try {
        // Use a deterministic daily word using the current date
        const today = new Date();
        const dayOfYear = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
            Date.UTC(today.getFullYear(), 0, 0)) /
            24 /
            60 /
            60 /
            1000);
        // Pick one word based on dayOfYear modulus total words count
        const countResult = await db_1.pool.query("SELECT COUNT(*) FROM words");
        const totalWords = parseInt(countResult.rows[0].count, 10);
        const offset = dayOfYear % totalWords;
        const wordResult = await db_1.pool.query(`SELECT * FROM words OFFSET $1 LIMIT 1`, [offset]);
        if (wordResult.rows.length === 0) {
            return res.status(404).json({ error: "No words found" });
        }
        const wordData = wordResult.rows[0];
        return res.json(wordData);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
// Health check endpoint
app.get("/health", (req, res) => {
    try {
        // Optionally, you could also ping the DB here
        res.json({ status: "ok" });
    }
    catch (err) {
        console.error("Health check failed:", err);
        res.status(500).json({ status: "error", message: "Backend unavailable" });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
