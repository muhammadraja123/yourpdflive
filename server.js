const express = require('express');
const path = require('path');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const Tesseract = require('tesseract.js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// health check
app.get('/', (_, res) => res.type('text').send('OK'));

// editor page
app.get('/editor', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'editor.html'));
});

// OCR endpoint
app.post('/ocr', async (req, res) => {
  try {
    const { imageBase64, lang = 'eng' } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const b64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(b64, 'base64');

    const { data } = await Tesseract.recognize(buf, lang);
    res.json({ text: data.text || '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'OCR failed' });
  }
});

// Export endpoint: flatten overlay images into the original PDF
app.post('/export', async (req, res) => {
  try {
    const { pdfBase64, overlays } = req.body || {};
    if (!pdfBase64 || !Array.isArray(overlays)) {
      return res.status(400).json({ error: 'Missing pdfBase64 or overlays' });
    }

    const raw = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const inputBytes = Buffer.from(raw, 'base64');

    const pdfDoc = await PDFDocument.load(inputBytes);

    for (const o of overlays) {
      const page = pdfDoc.getPage(o.pageIndex);
      const { width, height } = page.getSize();

      const pngBytes = Buffer.from(o.dataUrl.split(',')[1], 'base64');
      const png = await pdfDoc.embedPng(pngBytes);

      page.drawImage(png, { x: 0, y: 0, width, height });
    }

    const out = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="edited.pdf"');
    return res.send(Buffer.from(out));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Export failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
