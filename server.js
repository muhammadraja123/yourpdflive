// server.js (plain Node ESM)
import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: "*"}));
app.use(express.json());

// static assets (optional)
app.use("/public", express.static(path.join(__dirname, "public")));

// uploads dir
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) =>
    cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// health
app.get("/", (_req, res) => res.send("OK"));
app.get("/health", (_req, res) => res.json({ ok: true }));

// serve the editor page (keep editor.html in repo root)
app.get("/editor", (_req, res) =>
  res.sendFile(path.join(__dirname, "editor.html"))
);

// upload endpoint -> returns public URL
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ fileUrl });
});

// serve uploaded files
app.use("/uploads", express.static(uploadsDir));

// 404
app.use((_req, res) => res.status(404).send("Not Found"));

app.listen(PORT, () => console.log("Server on", PORT));
