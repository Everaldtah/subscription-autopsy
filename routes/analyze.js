'use strict';

const express = require('express');
const router = express.Router();
const { analyze } = require('../services/analyzer');

const analysisHistory = [];

router.post('/text', (req, res) => {
  const { csv_text } = req.body;
  if (!csv_text || !csv_text.trim()) {
    return res.status(400).json({ error: 'csv_text is required' });
  }

  try {
    const result = analyze(csv_text);
    analysisHistory.push({ id: `analysis_${Date.now()}`, ...result });
    res.json(result);
  } catch (err) {
    res.status(422).json({ error: 'Failed to analyze CSV', details: err.message });
  }
});

router.get('/history', (req, res) => {
  res.json({
    count: analysisHistory.length,
    analyses: analysisHistory.map(a => ({
      id: a.id,
      analyzedAt: a.analyzedAt,
      subscriptionCount: a.summary?.totalSubscriptions,
      totalMonthly: a.summary?.totalMonthlySpend,
      wastedMonthly: a.wasteSummary?.totalWastedMonthly,
    })),
  });
});

module.exports = router;
