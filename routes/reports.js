'use strict';

const express = require('express');
const router = express.Router();

router.get('/summary', (req, res) => {
  res.json({
    message: 'Run a POST /api/analyze/text first to get a summary',
    docs: 'Upload a CSV bank export and call /api/analyze/text with the content',
  });
});

router.get('/demo', (req, res) => {
  const { analyze } = require('../services/analyzer');
  const DEMO_CSV = `Date,Description,Amount
2026-04-01,NETFLIX.COM,-15.99
2026-04-01,SPOTIFY USA,-9.99
2026-04-05,SLACK TECHNOLOGIES,-87.50
2026-04-07,ADOBE SYSTEMS INC,-54.99
2026-04-10,GITHUB INC,-9.00
2026-04-15,FIGMA INC,-45.00
2026-04-15,MAILCHIMP,-30.00
2026-04-20,DATADOG INC,-210.00
2026-04-22,ZOOM VIDEO,-14.99
2026-03-01,NETFLIX.COM,-15.99
2026-03-01,SPOTIFY USA,-9.99
2026-03-05,SLACK TECHNOLOGIES,-87.50
2026-03-07,ADOBE SYSTEMS INC,-54.99
2026-03-10,GITHUB INC,-9.00
2026-03-15,FIGMA INC,-45.00
2026-03-15,MAILCHIMP,-30.00
2026-03-20,DATADOG INC,-210.00
2026-03-22,ZOOM VIDEO,-14.99
2026-02-01,NETFLIX.COM,-15.99
2026-02-01,SPOTIFY USA,-9.99
2026-02-05,SLACK TECHNOLOGIES,-87.50
2026-02-07,ADOBE SYSTEMS INC,-54.99
2026-02-10,GITHUB INC,-9.00
2026-02-22,ZOOM VIDEO,-14.99`;

  const result = analyze(DEMO_CSV);
  res.json(result);
});

module.exports = router;
