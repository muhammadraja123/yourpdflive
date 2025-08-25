// server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// COOP/COEP so pdf.js/tesseract wasm can run when you add them
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Serve the /public folder if you add assets later
app.use(express.static(path.join(__dirname, 'public')));

// Health check / base
app.get('/', (_req, res) => res.send('OK'));

// ➜ Serve /editor from the root-level editor.html
app.get('/editor', (_req, res) =>
  res.sendFile(path.join(__dirname, 'editor.html'))
);

// 404 (optional)
app.use((_req, res) => res.status(404).send('Not Found'));

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
