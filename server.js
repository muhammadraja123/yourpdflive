// @ts-nocheck
import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Tesseract from "tesseract.js";

// ESM-safe __dirname / __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// simple disk storage (ephemeral on Render free)
const storageDir = path.join(__dirname, "storage");
const filesDir = path.join(storageDir, "files");
fs.mkdirSync(filesDir, { recursive: true });

// serve saved PDFs
app.use("/d", express.static(filesDir, { index: false, maxAge: "1y" }));

// health
app.get("/health", (_, res) => res.send("ok"));

// upload raw file (PDF)
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, filesDir),
    filename: (_, file, cb) =>
      cb(null, `${uuid()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const id = path.parse(req.file.filename).name;
  return res.json({ id, url: `/d/${req.file.filename}` });
});

// save a finished PDF (multipart or dataUrl)
app.post("/api/save", upload.single("file"), async (req, res) => {
  try {
    if (req.file) {
      const id = path.parse(req.file.filename).name;
      return res.json({ id, url: `/d/${req.file.filename}` });
    }
    const { dataUrl } = req.body;
    if (!dataUrl) return res.status(400).json({ error: "No dataUrl" });
    const m = dataUrl.match(/^data:application\/pdf;base64,(.+)$/);
    if (!m) return res.status(400).json({ error: "Bad dataUrl" });
    const buf = Buffer.from(m[1], "base64");
    const name = `${uuid()}.pdf`;
    fs.writeFileSync(path.join(filesDir, name), buf);
    return res.json({ id: name.replace(".pdf", ""), url: `/d/${name}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "save_failed" });
  }
});

// optional server OCR
app.post("/api/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image" });
    const result = await Tesseract.recognize(req.file.path, "eng");
    const words = (result.data.words || []).map(w => ({
      text: w.text,
      bbox: w.bbox
    }));
    fs.unlink(req.file.path, () => {});
    res.json({ words });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "ocr_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
