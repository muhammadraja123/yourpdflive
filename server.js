// server.js
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const PUBLIC_DIR = path.join(__dirname, "public");
console.log("Serving from:", PUBLIC_DIR);

// Serve static assets in /public
app.use(express.static(PUBLIC_DIR));

// Health
app.get("/healthz", (_req, res) => res.send("ok"));

// Redirect root -> /editor
app.get("/", (_req, res) => res.redirect("/editor"));

// Send the editor HTML (NOTE: from /public/editor.html)
app.get("/editor", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "editor.html"));
});

// 404 fallback
app.use((_req, res) => res.status(404).send("Not Found"));

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
