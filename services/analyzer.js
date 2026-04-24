'use strict';

/**
 * Subscription detection and waste analysis engine.
 * Parses bank/accounting CSV exports and identifies recurring charges.
 */

const KNOWN_SUBSCRIPTIONS = {
  // Productivity
  'notion': { name: 'Notion', category: 'Productivity', typical: 16 },
  'slack': { name: 'Slack', category: 'Communication', typical: 7.25 },
  'monday': { name: 'Monday.com', category: 'Project Management', typical: 12 },
  'asana': { name: 'Asana', category: 'Project Management', typical: 13.49 },
  'trello': { name: 'Trello', category: 'Project Management', typical: 10 },
  'clickup': { name: 'ClickUp', category: 'Project Management', typical: 12 },
  'basecamp': { name: 'Basecamp', category: 'Project Management', typical: 15 },
  'airtable': { name: 'Airtable', category: 'Database', typical: 20 },
  'coda': { name: 'Coda', category: 'Productivity', typical: 36 },

  // Cloud / Infra
  'aws': { name: 'Amazon Web Services', category: 'Cloud Infrastructure', typical: 500 },
  'amazon web services': { name: 'Amazon Web Services', category: 'Cloud Infrastructure', typical: 500 },
  'google cloud': { name: 'Google Cloud', category: 'Cloud Infrastructure', typical: 300 },
  'azure': { name: 'Microsoft Azure', category: 'Cloud Infrastructure', typical: 400 },
  'digitalocean': { name: 'DigitalOcean', category: 'Cloud Infrastructure', typical: 50 },
  'vercel': { name: 'Vercel', category: 'Hosting', typical: 20 },
  'netlify': { name: 'Netlify', category: 'Hosting', typical: 19 },
  'heroku': { name: 'Heroku', category: 'Hosting', typical: 25 },

  // Design
  'figma': { name: 'Figma', category: 'Design', typical: 15 },
  'adobe': { name: 'Adobe Creative Cloud', category: 'Design', typical: 54.99 },
  'canva': { name: 'Canva', category: 'Design', typical: 12.99 },
  'sketch': { name: 'Sketch', category: 'Design', typical: 9 },

  // Dev tools
  'github': { name: 'GitHub', category: 'Developer Tools', typical: 9 },
  'gitlab': { name: 'GitLab', category: 'Developer Tools', typical: 29 },
  'jira': { name: 'Jira', category: 'Developer Tools', typical: 10 },
  'linear': { name: 'Linear', category: 'Developer Tools', typical: 8 },
  'datadog': { name: 'Datadog', category: 'Monitoring', typical: 15 },
  'sentry': { name: 'Sentry', category: 'Monitoring', typical: 26 },
  'new relic': { name: 'New Relic', category: 'Monitoring', typical: 25 },
  'postman': { name: 'Postman', category: 'Developer Tools', typical: 12 },

  // Marketing
  'mailchimp': { name: 'Mailchimp', category: 'Email Marketing', typical: 20 },
  'sendgrid': { name: 'SendGrid', category: 'Email Marketing', typical: 14.95 },
  'hubspot': { name: 'HubSpot', category: 'CRM/Marketing', typical: 50 },
  'salesforce': { name: 'Salesforce', category: 'CRM', typical: 75 },
  'intercom': { name: 'Intercom', category: 'Customer Support', typical: 74 },
  'zendesk': { name: 'Zendesk', category: 'Customer Support', typical: 55 },
  'mixpanel': { name: 'Mixpanel', category: 'Analytics', typical: 25 },
  'segment': { name: 'Segment', category: 'Analytics', typical: 120 },
  'hotjar': { name: 'Hotjar', category: 'Analytics', typical: 39 },
  'semrush': { name: 'SEMrush', category: 'SEO', typical: 129.95 },

  // Communication
  'zoom': { name: 'Zoom', category: 'Video Conferencing', typical: 14.99 },
  'webex': { name: 'Webex', category: 'Video Conferencing', typical: 25 },
  'loom': { name: 'Loom', category: 'Video', typical: 12.50 },
  'calendly': { name: 'Calendly', category: 'Scheduling', typical: 10 },

  // Storage
  'dropbox': { name: 'Dropbox', category: 'Storage', typical: 11.99 },
  'google workspace': { name: 'Google Workspace', category: 'Productivity Suite', typical: 12 },
  'microsoft 365': { name: 'Microsoft 365', category: 'Productivity Suite', typical: 12.50 },

  // Personal (flag as potentially non-business)
  'netflix': { name: 'Netflix', category: 'Entertainment', typical: 15.99, personal: true },
  'spotify': { name: 'Spotify', category: 'Music', typical: 9.99, personal: true },
  'hulu': { name: 'Hulu', category: 'Entertainment', typical: 17.99, personal: true },
  'disney': { name: 'Disney+', category: 'Entertainment', typical: 13.99, personal: true },
  'apple': { name: 'Apple Services', category: 'Apple', typical: 9.99 },
  'amazon prime': { name: 'Amazon Prime', category: 'Shopping/Entertainment', typical: 14.99 },

  // Finance
  'quickbooks': { name: 'QuickBooks', category: 'Accounting', typical: 30 },
  'xero': { name: 'Xero', category: 'Accounting', typical: 32 },
  'freshbooks': { name: 'FreshBooks', category: 'Accounting', typical: 17 },
  'stripe': { name: 'Stripe', category: 'Payments', typical: 0 },
  'gusto': { name: 'Gusto', category: 'Payroll', typical: 40 },
  'expensify': { name: 'Expensify', category: 'Expenses', typical: 9 },
};

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = /date|amount|description|merchant|debit|credit/.test(header);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map(line => parseTransactionLine(line, header, hasHeader))
    .filter(t => t !== null);
}

function parseTransactionLine(line, header, hasHeader) {
  // Handle quoted CSV fields
  const fields = [];
  let current = '';
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { fields.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  fields.push(current.trim());

  if (fields.length < 2) return null;

  // Try to identify columns by header
  let date = '', description = '', amount = 0;

  if (hasHeader) {
    const cols = header.split(',').map(h => h.trim().replace(/"/g, ''));
    const dateIdx = cols.findIndex(c => /date|time/.test(c));
    const descIdx = cols.findIndex(c => /desc|merchant|narration|name|memo/.test(c));
    const amtIdx = cols.findIndex(c => /amount|debit|credit|sum/.test(c));

    date = fields[dateIdx] || fields[0] || '';
    description = fields[descIdx] || fields[1] || '';
    const rawAmt = fields[amtIdx] || fields[2] || '0';
    amount = parseAmount(rawAmt);
  } else {
    date = fields[0] || '';
    description = fields[1] || '';
    amount = parseAmount(fields[2] || fields[1] || '0');
  }

  if (!description && !amount) return null;

  return {
    date: normalizeDate(date),
    description: description.replace(/"/g, ''),
    amount: Math.abs(amount),
    isDebit: amount <= 0 || /debit/.test(header),
  };
}

function parseAmount(raw) {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.\-+]/g, '');
  return parseFloat(cleaned) || 0;
}

function normalizeDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toISOString().split('T')[0];
}

function detectSubscriptions(transactions) {
  const merchantGroups = {};

  for (const tx of transactions) {
    if (tx.amount <= 0) continue;
    const key = normalizeDescription(tx.description);
    if (!merchantGroups[key]) {
      merchantGroups[key] = {
        rawName: tx.description,
        normalizedName: key,
        transactions: [],
      };
    }
    merchantGroups[key].transactions.push(tx);
  }

  const subscriptions = [];

  for (const [key, group] of Object.entries(merchantGroups)) {
    const txs = group.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Must appear at least twice to be "recurring"
    if (txs.length < 2) continue;

    const amounts = txs.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Check if amounts are consistent (within 10%)
    const isConsistentAmount = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

    if (!isConsistentAmount && txs.length < 3) continue;

    const frequency = detectFrequency(txs);
    if (!frequency) continue;

    const monthlyAmount = toMonthlyAmount(avgAmount, frequency);
    const knownMeta = findKnownMeta(key);
    const status = classifyStatus(key, monthlyAmount, txs, knownMeta);

    subscriptions.push({
      id: `sub_${subscriptions.length + 1}`,
      name: knownMeta?.name || formatName(group.rawName),
      rawName: group.rawName,
      category: knownMeta?.category || 'Other',
      frequency,
      lastCharged: txs[txs.length - 1].date,
      firstSeen: txs[0].date,
      occurrences: txs.length,
      avgAmount: Math.round(avgAmount * 100) / 100,
      monthlyAmount: Math.round(monthlyAmount * 100) / 100,
      annualAmount: Math.round(monthlyAmount * 12 * 100) / 100,
      status: status.status,
      reason: status.reason,
      isPersonal: knownMeta?.personal || false,
    });
  }

  return subscriptions.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

function detectFrequency(txs) {
  if (txs.length < 2) return null;
  const dates = txs.map(t => new Date(t.date));
  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  if (avgGap <= 8) return 'weekly';
  if (avgGap <= 16) return 'biweekly';
  if (avgGap <= 35) return 'monthly';
  if (avgGap <= 100) return 'quarterly';
  if (avgGap <= 380) return 'annual';
  return null;
}

function toMonthlyAmount(amount, frequency) {
  switch (frequency) {
    case 'weekly': return amount * 4.33;
    case 'biweekly': return amount * 2.17;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'annual': return amount / 12;
    default: return amount;
  }
}

function normalizeDescription(desc) {
  return desc
    .toLowerCase()
    .replace(/\*+/g, ' ')
    .replace(/[0-9]{4,}/g, '')  // remove transaction IDs
    .replace(/\s+/g, ' ')
    .replace(/\.com|\.io|\.net/g, '')
    .trim()
    .slice(0, 40);
}

function formatName(raw) {
  return raw
    .replace(/[*#@]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\d{5,}/g, '')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 40);
}

function findKnownMeta(normalizedKey) {
  for (const [pattern, meta] of Object.entries(KNOWN_SUBSCRIPTIONS)) {
    if (normalizedKey.includes(pattern)) return meta;
  }
  return null;
}

function classifyStatus(key, monthlyAmount, txs, knownMeta) {
  // Personal subscriptions on business accounts are waste
  if (knownMeta?.personal) {
    return { status: 'waste', reason: 'Personal subscription on business account' };
  }

  // Check if it went unusually quiet (no recent transactions in expected window)
  const lastDate = new Date(txs[txs.length - 1].date);
  const now = new Date();
  const daysSinceLast = (now - lastDate) / (1000 * 60 * 60 * 24);

  if (daysSinceLast > 45 && txs.length >= 3) {
    return { status: 'warning', reason: `No charge in ${Math.round(daysSinceLast)} days — possibly cancelled or missed` };
  }

  // Very high-spend items flag for review
  if (monthlyAmount > 500) {
    return { status: 'warning', reason: 'High spend — verify utilization with team' };
  }

  // Low-frequency with low amount — likely forgotten trial
  if (txs.length === 2 && monthlyAmount < 20) {
    return { status: 'warning', reason: 'Only 2 charges detected — may be trial converting to paid' };
  }

  return { status: 'active', reason: '' };
}

function buildSummary(subscriptions) {
  const totalMonthly = subscriptions.reduce((acc, s) => acc + s.monthlyAmount, 0);
  const wastedSubs = subscriptions.filter(s => s.status === 'waste');
  const warningSubs = subscriptions.filter(s => s.status === 'warning');
  const totalWasted = wastedSubs.reduce((acc, s) => acc + s.monthlyAmount, 0);
  const categoryTotals = {};
  for (const s of subscriptions) {
    categoryTotals[s.category] = (categoryTotals[s.category] || 0) + s.monthlyAmount;
  }

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  return {
    totalSubscriptions: subscriptions.length,
    totalMonthlySpend: Math.round(totalMonthly * 100) / 100,
    totalAnnualSpend: Math.round(totalMonthly * 12 * 100) / 100,
    wastedCount: wastedSubs.length,
    totalWastedMonthly: Math.round(totalWasted * 100) / 100,
    totalWastedAnnually: Math.round(totalWasted * 12 * 100) / 100,
    warningCount: warningSubs.length,
    topSpendCategory: topCategory ? topCategory[0] : 'N/A',
    topCategoryMonthly: topCategory ? Math.round(topCategory[1] * 100) / 100 : 0,
    categoryBreakdown: Object.fromEntries(
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
  };
}

function analyze(csvText) {
  const transactions = parseCSV(csvText);
  const subscriptions = detectSubscriptions(transactions);
  const summary = buildSummary(subscriptions);
  const wasteSummary = {
    totalWastedMonthly: summary.totalWastedMonthly,
    totalWastedAnnually: summary.totalWastedAnnually,
    wastedCount: summary.wastedCount,
    recommendations: subscriptions
      .filter(s => s.status === 'waste' || s.status === 'warning')
      .map(s => ({ name: s.name, action: s.status === 'waste' ? 'Cancel immediately' : 'Review utilization', savings: s.monthlyAmount })),
  };

  return {
    transactionCount: transactions.length,
    subscriptions,
    summary,
    wasteSummary,
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = { analyze, parseCSV, detectSubscriptions, buildSummary };
