import express from 'express';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '100mb' }));
app.use('/estilos', express.static(join(__dirname, 'public', 'estilos')));
app.use('/fundos', express.static(join(__dirname, 'public', 'fundos')));

const uploadDir = join(__dirname, 'public', 'fundos');
await mkdir(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.mp3';
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
app.post('/api/upload', async (req, res) => {
  try {
    const { styleName, note, fileName, data } = req.body;
    if (!styleName || !note || !data) {
      return res.status(400).json({ error: 'styleName, note e data são obrigatórios' });
    }

    const sanitizedName = styleName.replace(/[^a-zA-Z0-9_-\s]/g, '').trim();
    const ext = extname(fileName || 'audio.mp3');
    const dir = join(__dirname, 'public', 'estilos', sanitizedName);
    await mkdir(dir, { recursive: true });

    const filePath = join(dir, `${note}${ext}`);
    const buffer = Buffer.from(data, 'base64');
    await writeFile(filePath, buffer);

    res.json({ path: `/estilos/${sanitizedName}/${note}${ext}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-background', upload.single('audio'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({ error: 'name e audio são obrigatórios' });
    }
    res.json({
      path: `/fundos/${req.file.filename}`,
      name: name.trim(),
      description: description?.trim() || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delete-style', async (req, res) => {
  try {
    const { styleName } = req.body;
    if (!styleName) {
      return res.status(400).json({ error: 'styleName é obrigatório' });
    }
    const sanitizedName = styleName.replace(/[^a-zA-Z0-9_-\s]/g, '').trim();
    const dir = join(__dirname, 'public', 'estilos', sanitizedName);
    await rm(dir, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor de upload rodando em http://localhost:${PORT}`);
});
