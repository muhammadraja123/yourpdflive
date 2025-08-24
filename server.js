import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import Tesseract from "tesseract.js"; // installed via package.json

// ----- Resolve __dirname with ESM -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----- Basic app setup -----
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ----- Storage (ephemeral on Render) -----
const storageDir = path.join(__dirname, "uploads");
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

// Multer to disk
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, storageDir),
    filename: (_req, file, cb) => {
      const id = randomUUID();
      const ext = path.extname(file.originalname) || "";
      cb(null, `${id}${ext}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// ----- Health -----
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ----- Upload a file -----
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });
  const id = path.parse(req.file.filename).name; // uuid without ext
  res.json({
    id,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: `/api/files/${req.file.filename}`
  });
});

// ----- Download a stored file by filename -----
app.get("/api/files/:filename", (req, res) => {
  const filePath = path.join(storageDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "not found" });
  res.sendFile(filePath);
});

// ----- OCR (images only: png/jpg/jpeg) -----
// You can either POST a new file OR pass an existing filename.
app.post("/api/ocr", upload.single("image"), async (req, res) => {
  try {
    let filePath;
    if (req.file) {
      filePath = req.file.path;
    } else if (req.body.filename) {
      filePath = path.join(storageDir, req.body.filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "file not found" });
    } else {
      return res.status(400).json({ error: "upload an image or provide 'filename'" });
    }

    // Tesseract simple recognize
    const { data } = await Tesseract.recognize(filePath, "eng"); // loads eng from CDN
    res.json({ text: data.text ?? "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ocr_failed", detail: String(err?.message || err) });
  }
});

// ----- Start server -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
