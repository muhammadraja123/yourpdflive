// server.js
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Resolve absolute path to this project on Render (e.g. /opt/render/project/src)
const ROOT = path.resolve();

// Serve everything in /public (JS, CSS, images, editor assets)
app.use(express.static(path.join(ROOT, "public")));

// Health check
app.get("/healthz", (_req, res) => res.send("ok"));

// Landing route (optional) – redirect to /editor
app.get("/", (_req, res) => {
  res.redirect("/editor");
});

// IMPORTANT: Send the actual editor file from /public/editor.html
app.get("/editor", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "editor.html"));
});

// 404 fallback for other routes
app.use((_req, res) => res.status(404).send("Not Found"));

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
