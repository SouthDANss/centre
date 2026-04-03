import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool, testConnection } from "./db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await testConnection();
    res.json({ ok: true, message: "MySQL connection is working" });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/api/programs", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, program_type, start_date, rating FROM programs ORDER BY id"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/programs/:programId/modules", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, program_id, module_order, code, title, description, video_url
       FROM modules
       WHERE program_id = ?
       ORDER BY module_order`,
      [req.params.programId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, surname, regNumber, email, password } = req.body;
    if (!fullName || !surname || !regNumber || !email || !password) {
      return res.status(400).json({ message: "Заповніть усі поля." });
    }

    const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) {
      return res.status(409).json({ message: "Користувач з таким email вже існує." });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (role, full_name, surname, reg_number, email, password_hash)
       VALUES ('student', ?, ?, ?, ?, ?)`,
      [fullName, surname, regNumber, email, hash]
    );

    const [rows] = await pool.query(
      `SELECT id, role, full_name AS fullName, surname, reg_number AS regNumber, email
       FROM users WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query(
      `SELECT id, role, full_name AS fullName, surname, reg_number AS regNumber, email, password_hash
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Невірний email або пароль." });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Невірний email або пароль." });
    }

    delete user.password_hash;
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users/:userId/applications", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, program_id AS programId, status, approved_by AS approvedBy, approved_at AS approvedAt
       FROM program_applications
       WHERE user_id = ?
       ORDER BY id`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    const { userId, programId } = req.body;
    if (!userId || !programId) {
      return res.status(400).json({ message: "Не вистачає userId або programId." });
    }

    const [exists] = await pool.query(
      "SELECT id FROM program_applications WHERE user_id = ? AND program_id = ?",
      [userId, programId]
    );
    if (exists.length) {
      return res.status(409).json({ message: "Заявка вже існує." });
    }

    await pool.query(
      `INSERT INTO program_applications (user_id, program_id, status)
       VALUES (?, ?, 'pending')`,
      [userId, programId]
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/admin/pending-applications", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pa.id,
              pa.user_id AS userId,
              u.full_name AS userName,
              u.reg_number AS regNumber,
              pa.program_id AS programId,
              p.title AS programTitle,
              pa.status
       FROM program_applications pa
       INNER JOIN users u ON u.id = pa.user_id
       INNER JOIN programs p ON p.id = pa.program_id
       WHERE pa.status = 'pending'
       ORDER BY pa.id`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/admin/approve-application", async (req, res) => {
  try {
    const { applicationId, adminUserId } = req.body;
    await pool.query(
      `UPDATE program_applications
       SET status = 'approved', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [adminUserId || null, applicationId]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users/:userId/progress/:programId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT module_id AS moduleId, watched, watched_once AS watchedOnce, passed, score
       FROM module_progress
       WHERE user_id = ? AND program_id = ?`,
      [req.params.userId, req.params.programId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/progress/upsert", async (req, res) => {
  try {
    const { userId, programId, moduleId, watched, watchedOnce, passed, score } = req.body;
    await pool.query(
      `INSERT INTO module_progress (user_id, program_id, module_id, watched, watched_once, passed, score)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         watched = VALUES(watched),
         watched_once = VALUES(watched_once),
         passed = VALUES(passed),
         score = VALUES(score)`,
      [userId, programId, moduleId, watched ? 1 : 0, watchedOnce ? 1 : 0, passed ? 1 : 0, score ?? null]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/admin/modules/update", async (req, res) => {
  try {
    const { id, code, title, description, videoUrl } = req.body;
    await pool.query(
      `UPDATE modules
       SET code = ?, title = ?, description = ?, video_url = ?
       WHERE id = ?`,
      [code, title, description, videoUrl || "", id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API server started on http://localhost:${PORT}`);
});
