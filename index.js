'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');

const analyzeRouter = require('./routes/analyze');
const uploadRouter = require('./routes/upload');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/analyze', analyzeRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/reports', reportsRouter);

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Subscription Autopsy</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .hero { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 60px 20px; text-align: center; }
    h1 { font-size: 3em; color: #a78bfa; margin-bottom: 12px; }
    .subtitle { color: #94a3b8; font-size: 1.2em; max-width: 600px; margin: 0 auto 40px; }
    .container { max-width: 960px; margin: 40px auto; padding: 0 20px; }
    .card { background: #1e293b; border-radius: 12px; padding: 28px; margin-bottom: 24px; border: 1px solid #334155; }
    h2 { color: #a78bfa; margin-bottom: 16px; font-size: 1.3em; }
    .upload-area { border: 2px dashed #4f46e5; border-radius: 8px; padding: 40px; text-align: center; cursor: pointer; transition: border-color 0.2s; }
    .upload-area:hover { border-color: #a78bfa; }
    .btn { background: #4f46e5; color: white; padding: 12px 28px; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: 600; }
    .btn:hover { background: #4338ca; }
    .result-card { background: #0f172a; border-radius: 8px; padding: 20px; margin-top: 20px; }
    pre { font-size: 0.82em; overflow: auto; white-space: pre-wrap; color: #a78bfa; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #4f46e5; color: white; padding: 10px 12px; text-align: left; font-size: 0.85em; }
    td { padding: 10px 12px; border-bottom: 1px solid #1e293b; font-size: 0.9em; }
    tr:hover td { background: #1e293b; }
    .waste { color: #f87171; font-weight: bold; }
    .healthy { color: #4ade80; }
    .warning { color: #fbbf24; }
    .savings-box { background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0; }
    .savings-amount { font-size: 3em; font-weight: bold; color: white; }
    code { background: #0f172a; padding: 2px 8px; border-radius: 4px; color: #a78bfa; font-size: 0.85em; }
    .endpoint { padding: 6px 0; border-bottom: 1px solid #334155; font-size: 0.9em; }
    input[type="file"] { display: none; }
    label.file-label { display: inline-block; cursor: pointer; }
    textarea { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; padding: 12px; font-family: monospace; font-size: 0.85em; height: 180px; resize: vertical; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>🔬 Subscription Autopsy</h1>
    <p class="subtitle">Upload your bank or accounting CSV and discover which subscriptions are bleeding money. Stop paying for tools nobody uses.</p>
  </div>

  <div class="container">
    <div class="card">
      <h2>📊 Analyze Your Subscriptions</h2>
      <p style="color:#94a3b8;margin-bottom:20px;">Upload a CSV bank statement or paste transactions. We'll detect all recurring charges, flag unused or duplicate subscriptions, and calculate your monthly waste.</p>

      <div class="upload-area" onclick="document.getElementById('csvFile').click()">
        <p style="font-size:2em;margin-bottom:8px;">📁</p>
        <p>Click to upload a CSV file</p>
        <p style="color:#64748b;font-size:0.85em;margin-top:4px;">Chase, Bank of America, QuickBooks, or any standard bank export</p>
        <label class="file-label">
          <input type="file" id="csvFile" accept=".csv" onchange="handleFileUpload(this)">
        </label>
      </div>

      <div style="text-align:center;color:#64748b;margin:12px 0;">or</div>

      <textarea id="csvText" placeholder="Date,Description,Amount&#10;2026-04-01,NETFLIX.COM,-15.99&#10;2026-04-01,SPOTIFY,-9.99&#10;2026-04-05,SLACK,-87.50&#10;2026-04-07,ADOBE CREATIVE CLOUD,-54.99&#10;2026-03-01,NETFLIX.COM,-15.99&#10;2026-03-01,SPOTIFY,-9.99&#10;2026-03-05,SLACK,-87.50"></textarea>

      <br><br>
      <button class="btn" onclick="analyzeText()">Run Autopsy</button>
    </div>

    <div id="results" style="display:none"></div>

    <div class="card">
      <h2>🔌 API Reference</h2>
      <div class="endpoint"><code>POST /api/upload/csv</code> — Upload CSV file</div>
      <div class="endpoint"><code>POST /api/analyze/text</code> — Analyze CSV text directly</div>
      <div class="endpoint"><code>GET  /api/reports/summary</code> — Get latest analysis summary</div>
      <div class="endpoint"><code>GET  /api/reports/history</code> — Analysis history</div>
      <div style="margin-top:12px;"><a href="/docs" style="color:#a78bfa;">→ Full API Documentation</a></div>
    </div>
  </div>

  <script>
  async function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const text = await file.text();
    document.getElementById('csvText').value = text;
    analyzeText();
  }

  async function analyzeText() {
    const text = document.getElementById('csvText').value;
    if (!text.trim()) return alert('Please enter some transaction data');
    const res = await fetch('/api/analyze/text', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({csv_text: text})
    });
    const data = await res.json();
    renderResults(data);
  }

  function renderResults(data) {
    const el = document.getElementById('results');
    el.style.display = 'block';

    const subs = data.subscriptions || [];
    const waste = data.wasteSummary || {};

    const rows = subs.map(s => \`
      <tr>
        <td>\${s.name}</td>
        <td>\${s.category || '—'}</td>
        <td>\${s.frequency}</td>
        <td>$\${s.monthlyAmount.toFixed(2)}</td>
        <td class="\${s.status === 'waste' ? 'waste' : s.status === 'warning' ? 'warning' : 'healthy'}">\${s.status.toUpperCase()}</td>
        <td style="color:#94a3b8;font-size:0.8em">\${s.reason || ''}</td>
      </tr>
    \`).join('');

    el.innerHTML = \`
      <div class="savings-box">
        <p style="color:rgba(255,255,255,0.7);margin-bottom:8px;">Potential Monthly Savings</p>
        <div class="savings-amount">$\${(waste.totalWastedMonthly || 0).toFixed(2)}</div>
        <p style="color:rgba(255,255,255,0.7);margin-top:8px;">\${waste.wastedCount || 0} subscriptions flagged as waste</p>
      </div>
      <div class="card">
        <h2>📋 Subscription Breakdown</h2>
        <table>
          <tr><th>Service</th><th>Category</th><th>Frequency</th><th>Monthly</th><th>Status</th><th>Reason</th></tr>
          \${rows || '<tr><td colspan="6" style="text-align:center;color:#64748b">No subscriptions detected</td></tr>'}
        </table>
      </div>
      <div class="card">
        <h2>📈 Summary</h2>
        <pre>\${JSON.stringify(data.summary, null, 2)}</pre>
      </div>
    \`;
  }
  </script>
</body>
</html>
  `);
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Subscription Autopsy running on http://localhost:${PORT}`);
});

module.exports = app;
