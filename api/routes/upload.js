import express from 'express';
import multer from 'multer';
import { uploadToS3 } from '../utils/s3Uploader.js';

const router = express.Router();
const upload = multer(); // Memory storage

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const fileUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

export default router;
