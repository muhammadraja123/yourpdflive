// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public"))); // serve /public

// ---- library proxy so everything is served from YOUR Render domain ----
const LIBS = {
  "pdf.min.js": "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  "pdf.worker.min.js": "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "pdf-lib.min.js": "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  "tesseract.min.js": "https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/tesseract.min.js",
  "tesseract.worker.min.js": "https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/worker.min.js",
  "tesseract-core-simd.wasm.js":
    "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core-simd.wasm.js"
};

const cache = new Map();
app.get("/lib/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const url = LIBS[name];
    if (!url) return res.status(404).send("Unknown lib");
    if (!cache.has(name)) {
      const r = await fetch(url);
      if (!r.ok) throw new Error("Fetch failed " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const type = name.endsWith(".js")
        ? "application/javascript"
        : "application/octet-stream";
      cache.set(name, { buf, type });
    }
    const { buf, type } = cache.get(name);
    res.set("Content-Type", type);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buf);
  } catch (e) {
    res.status(500).send("Lib proxy error");
  }
});

// editor page
app.get("/editor", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "editor.html"))
);

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
