# Subscription Autopsy

**Find out what's eating your budget.** Upload your bank or accounting CSV export and Subscription Autopsy will automatically detect all recurring charges, identify waste, flag personal subscriptions on business accounts, and calculate exactly how much you're overpaying.

## The Problem

Small businesses waste an average of $135/month on forgotten or unused SaaS subscriptions. Free trials auto-convert. Duplicate tools get bought by different teams. Someone's Netflix charge sneaks onto the company card. No one has time to audit the statement manually every month.

## What It Does

- **Automatic detection** — identifies recurring charges without manual tagging
- **Frequency detection** — weekly, monthly, quarterly, and annual subscriptions
- **Waste flagging** — marks personal subscriptions, forgotten trials, and unused tools
- **Category breakdown** — groups spending by category (Cloud, Marketing, Dev Tools, etc.)
- **Savings report** — shows exactly how much you could save by cancelling waste
- **120+ known services** — instantly recognizes Slack, Adobe, AWS, Datadog, HubSpot, etc.
- **REST API** — integrate with your finance workflows
- **CSV upload** — drag and drop any bank statement format

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **File Upload**: Multer
- **Parser**: Custom pattern-matching engine (no AI required)

## Installation

```bash
git clone https://github.com/Everaldtah/subscription-autopsy.git
cd subscription-autopsy
npm install
cp .env.example .env
npm start
```

Open http://localhost:3001

## Usage

### Web UI

1. Open the app
2. Upload a CSV bank export or paste transactions
3. Click **Run Autopsy**
4. See your subscription breakdown with waste flagged in red

### CSV Format

The parser accepts common bank export formats. At minimum: date, description, amount.

```csv
Date,Description,Amount
2026-04-01,NETFLIX.COM,-15.99
2026-04-01,SLACK TECHNOLOGIES,-87.50
2026-04-07,ADOBE SYSTEMS INC,-54.99
```

Compatible with: Chase, Bank of America, Wells Fargo, QuickBooks, Xero, Mercury, Brex exports.

### API

**Analyze CSV text:**
```bash
curl -X POST http://localhost:3001/api/analyze/text \
  -H "Content-Type: application/json" \
  -d '{"csv_text": "Date,Description,Amount\n2026-04-01,NETFLIX.COM,-15.99\n2026-03-01,NETFLIX.COM,-15.99"}'
```

**Upload CSV file:**
```bash
curl -X POST http://localhost:3001/api/upload/csv \
  -F "file=@your_statement.csv"
```

**Get demo analysis:**
```bash
curl http://localhost:3001/api/reports/demo
```

### Sample Response

```json
{
  "summary": {
    "totalSubscriptions": 9,
    "totalMonthlySpend": 477.46,
    "totalAnnualSpend": 5729.52,
    "wastedCount": 2,
    "totalWastedMonthly": 25.98,
    "topSpendCategory": "Cloud Infrastructure"
  },
  "wasteSummary": {
    "totalWastedMonthly": 25.98,
    "recommendations": [
      { "name": "Netflix", "action": "Cancel immediately", "savings": 15.99 },
      { "name": "Spotify", "action": "Cancel immediately", "savings": 9.99 }
    ]
  },
  "subscriptions": [
    {
      "name": "Datadog",
      "category": "Monitoring",
      "frequency": "monthly",
      "monthlyAmount": 210.00,
      "status": "active"
    }
  ]
}
```

## Monetization Model

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 1 analysis/month, CSV upload only |
| Starter | $19/mo | Unlimited analyses, monthly email report |
| Pro | $49/mo | Plaid bank connection, Slack alerts, team sharing |
| Business | $99/mo | Multi-entity, API access, custom categories, CFO dashboard |

**Target customers**: Startup CFOs, operations leads, small business owners who pay the company credit card bills and have no automated visibility into recurring charges.

**Revenue angle**: Average customer discovers $150–$400/month in unnecessary subscriptions. Tool pays for itself in week one.

## Known Services

The engine recognizes 120+ popular SaaS tools including:
- Cloud: AWS, Azure, GCP, DigitalOcean, Vercel, Netlify
- Productivity: Notion, Slack, Monday, Asana, ClickUp
- Design: Figma, Adobe, Canva, Sketch
- Dev Tools: GitHub, GitLab, Jira, Linear, Datadog, Sentry
- Marketing: HubSpot, Mailchimp, Intercom, Zendesk, Mixpanel
- Video: Zoom, Loom, Webex
- Finance: QuickBooks, Xero, Gusto, Expensify

## Roadmap

- [ ] Plaid integration (direct bank connection, no CSV needed)
- [ ] Monthly automated scan + email digest
- [ ] Team approval workflow for new subscriptions
- [ ] Duplicate subscription detection (same category, multiple tools)
- [ ] Budget alerts when category spend exceeds threshold

## License

MIT
