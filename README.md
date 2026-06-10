# 📈 Utility-Based Portfolio Allocation Agent — Interactive Demo

A React-based interactive dashboard for visualizing an AI-driven portfolio allocation engine that selects optimal stock weights by maximizing expected utility across three investor risk profiles. Built as a course demo for **Introduction to AI (IAI)** at MIT Manipal.

---

## 🎯 Features

### Core Features
- **Interactive Portfolio Simulator** — Toggle between Aggressive (λ=0.5), Balanced (λ=2.0), and Conservative (λ=5) investor profiles and see allocation charts update in real time
- **Efficient Frontier Visualization** — 5,000 simulated Monte Carlo portfolio combinations plotted with optimal portfolios highlighted for each risk profile
- **Asset Overview Grid** — 6-stock card grid (AAPL, MSFT, JNJ, JPM, XOM, AMZN) showing expected return, risk, and sector badges
- **Correlation Heatmap** — Hardcoded pairwise correlation matrix for all six equities with color-coded cells
- **Cumulative Growth Chart** — 24-month simulated portfolio growth trajectories across all three investor profiles
- **Monte Carlo Return Distribution** — Histogram of 5,000 simulated annual returns for the selected active profile
- **Profile Comparison Panel** — Side-by-side utility score, expected return, and risk metrics for all three profiles
- **PDF Export** — One-click report export using jsPDF + html2canvas

### Dashboard Sections
- **Hero Section** — Project title, tagline, MIT Manipal branding, and authors
- **How It Works** — 5-step pipeline walkthrough (data → utility function → optimizer → profiles → comparison)
- **Asset Overview** — Stock cards with sector color badges (Technology, Healthcare, Financials, Energy, Consumer Discretionary)
- **Portfolio Simulator** — Donut chart + bar chart allocation view with rebalancing frequency selector
- **Efficient Frontier** — Scatter plot of 5,000 portfolios with three optimal-point callouts
- **Correlation Heatmap** — 6×6 matrix rendered as an interactive color grid
- **Cumulative Growth** — Area/line chart showing 24-month growth simulation
- **Monte Carlo Distribution** — Bar histogram of simulated annual returns
- **Profile Comparison** — Metric cards for Aggressive, Balanced, and Conservative outcomes

### Visualization Suite
- **Donut Charts** — Proportional allocation breakdown per investor profile
- **Bar Charts** — Per-asset allocation comparison across AAPL, MSFT, JNJ, JPM, XOM, AMZN
- **Scatter Plot** — Efficient frontier cloud with highlighted optimal portfolios
- **Area Charts** — Smooth cumulative growth trajectories with gradient fills
- **Histogram** — Monte Carlo return distribution with frequency buckets

---

## 🛠️ Tech Stack

| Component | Technology | Details |
|-----------|-----------|---------|
| **Frontend Framework** | React 19 + Vite 8 | Component-based SPA, HMR dev server |
| **Charts** | Recharts 3 | PieChart, BarChart, ScatterChart, AreaChart, LineChart |
| **Styling** | Tailwind CSS 3 | Utility-first dark theme |
| **PDF Export** | jsPDF 4 + html2canvas 1 | Client-side report generation |
| **Build Tool** | Vite 8 | Fast bundling with Rollup |
| **Linting** | ESLint 9 | React hooks + refresh plugins |
| **Language** | JavaScript (JSX) | No TypeScript required |

---

## 📋 Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org/)
- **npm 9+** — Comes automatically with Node.js
- **Modern browser** — Chrome, Firefox, Safari, or Edge

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start the Dev Server

```bash
npm run dev
```

You should see:
```
  VITE v8.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 3: Open in Browser

Navigate to: **http://localhost:5173**

---

## 📖 Detailed Setup Instructions

### Windows

```bash
# 1. Navigate to the project folder
cd path\to\Project

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

### macOS / Linux

```bash
# 1. Navigate to the project folder
cd /path/to/Project

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

---

## 📁 Project Structure

```
Project/
├── index.html                  # App entry point (Vite template)
├── vite.config.js              # Vite + React plugin config
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS with Autoprefixer
├── eslint.config.js            # ESLint flat config
├── package.json                # Dependencies and scripts
├── README.md                   # This file
│
├── public/
│   ├── favicon.svg             # Browser tab icon
│   └── icons.svg               # SVG icon definitions
│
├── src/
│   ├── main.jsx                # React root mount
│   ├── App.jsx                 # Full single-page app (all sections + logic)
│   ├── App.css                 # Component-level styles
│   └── index.css               # Global styles + Tailwind directives
│
└── dist/                       # Production build output (auto-generated)
    ├── index.html
    └── assets/
        ├── index-*.css
        ├── index-*.js
        └── (chunked vendor bundles)
```

---

## 📊 Hardcoded Data & Methodology

All data in the dashboard is derived from the research paper and hardcoded for the demo — no live API calls are made.

### Assets

| Ticker | Sector | Expected Return | Risk (σ) |
|--------|--------|-----------------|----------|
| AAPL | Technology | 12.8% | 17.4% |
| MSFT | Technology | 11.9% | 15.1% |
| JNJ | Healthcare | 8.2% | 8.4% |
| JPM | Financials | 10.2% | 14.3% |
| XOM | Energy | 9.1% | 12.2% |
| AMZN | Consumer Discretionary | 14.5% | 21.5% |

### Investor Profiles (Utility Function: U = E(R) − λ/2 · σ²)

| Profile | λ | Expected Return | Risk | Utility Score |
|---------|---|-----------------|------|---------------|
| Aggressive | 0.5 | 13.9% | 17.2% | 12.42 |
| Balanced | 2.0 | 11.2% | 12.9% | 9.54 |
| Conservative | 5.0 | 8.7% | 9.1% | 6.63 |

### Monte Carlo Simulation
- **5,000 portfolio combinations** sampled across the feasible allocation space
- **Efficient frontier** generated via a seeded pseudo-random function for consistent rendering
- **Return distribution histogram** uses 5,000 pseudo-normal samples per profile

---

## 🖨️ PDF Export

The dashboard includes a one-click PDF export button in the hero section:

1. Click **"Export PDF"** in the top-right of the hero
2. `html2canvas` captures the full dashboard as a canvas
3. `jsPDF` encodes and downloads the report as `portfolio-report.pdf`

---

## 🔧 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Dev Server** | `npm run dev` | Start HMR development server at localhost:5173 |
| **Build** | `npm run build` | Compile and bundle for production into `dist/` |
| **Preview** | `npm run preview` | Serve the production build locally for review |
| **Lint** | `npm run lint` | Run ESLint across all source files |

---

## 🚨 Troubleshooting

### Issue: `npm install` fails with peer dependency errors
**Solution:** Use the legacy peer deps flag:
```bash
npm install --legacy-peer-deps
```

### Issue: Port 5173 already in use
**Solution:** Specify a different port:
```bash
npm run dev -- --port 3000
```

### Issue: Charts not rendering / blank page
**Solution:** Ensure Node.js 18+ is installed:
```bash
node --version  # Should be v18.x or higher
```

### Issue: PDF export produces a blank file
**Solution:** Wait for all charts to fully render before clicking Export — the `html2canvas` capture requires the DOM to be painted. Try scrolling through the dashboard once before exporting.

### Issue: `vite: command not found`
**Solution:** Run `npm install` first to restore the local `node_modules`:
```bash
npm install
npm run dev
```

---

## 📈 Future Enhancements

- [ ] Live stock data integration via a financial API (e.g. Yahoo Finance, Alpha Vantage)
- [ ] User-adjustable λ slider for continuous utility optimization
- [ ] Real Monte Carlo engine running in a Web Worker
- [ ] CSV/Excel export of portfolio weights and metrics
- [ ] Dark/light theme toggle
- [ ] Responsive mobile layout
- [ ] Additional assets and multi-sector diversification
- [ ] Backtesting module using historical price data

---

## 👨‍💻 Author

**Arjun Mittal**  
GitHub: [@ArjunMittal12](https://github.com/ArjunMittal12)  

## 🙋 Support

Found a bug or have a feature request?  
Open an issue in the repository after pushing to GitHub.


---

## 📄 License

No specific license. Contact the authors for usage rights.

---

**Made with 📊 for intelligent finance enthusiasts**
