'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { analyze } = require('../services/analyzer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'));
    }
  },
});

router.post('/csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded. Use field name: file' });
  }

  try {
    const csvText = req.file.buffer.toString('utf-8');
    const result = analyze(csvText);
    res.json({ filename: req.file.originalname, ...result });
  } catch (err) {
    res.status(422).json({ error: 'Failed to parse CSV', details: err.message });
  }
});

module.exports = router;
