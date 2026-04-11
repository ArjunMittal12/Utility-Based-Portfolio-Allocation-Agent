import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const assets = [
  { ticker: 'AAPL', expectedReturn: 12.8, risk: 17.4, color: '#38bdf8' },
  { ticker: 'MSFT', expectedReturn: 11.9, risk: 15.1, color: '#2dd4bf' },
  { ticker: 'JNJ', expectedReturn: 8.2, risk: 8.4, color: '#a3e635' },
  { ticker: 'JPM', expectedReturn: 10.2, risk: 14.3, color: '#f59e0b' },
  { ticker: 'XOM', expectedReturn: 9.1, risk: 12.2, color: '#fb7185' },
  { ticker: 'AMZN', expectedReturn: 14.5, risk: 21.5, color: '#c084fc' },
]

const profiles = {
  aggressive: {
    name: 'Aggressive',
    lambda: 0.5,
    return: 13.9,
    risk: 17.2,
    utility: 12.42,
    color: '#f97316',
    allocation: [22, 18, 8, 15, 10, 27],
  },
  balanced: {
    name: 'Balanced',
    lambda: 2,
    return: 11.2,
    risk: 12.9,
    utility: 9.54,
    color: '#22c55e',
    allocation: [20, 23, 18, 14, 13, 12],
  },
  conservative: {
    name: 'Conservative',
    lambda: 5,
    return: 8.7,
    risk: 9.1,
    utility: 6.63,
    color: '#60a5fa',
    allocation: [16, 22, 27, 12, 15, 8],
  },
}

const steps = [
  'Estimate expected returns and covariance from market history.',
  'Define investor utility function U = E(R) - λ * σ².',
  'Apply constraints: sum(weights) = 1 and no short-selling.',
  'Run optimizer for each risk aversion profile.',
  'Compare allocation, risk-return tradeoff, and utility outcomes.',
]

const correlationMatrix = [
  { ticker: 'AAPL', AAPL: 1.0, MSFT: 0.78, JNJ: 0.32, JPM: 0.55, XOM: 0.41, AMZN: 0.74 },
  { ticker: 'MSFT', AAPL: 0.78, MSFT: 1.0, JNJ: 0.29, JPM: 0.52, XOM: 0.37, AMZN: 0.8 },
  { ticker: 'JNJ', AAPL: 0.32, MSFT: 0.29, JNJ: 1.0, JPM: 0.34, XOM: 0.27, AMZN: 0.25 },
  { ticker: 'JPM', AAPL: 0.55, MSFT: 0.52, JNJ: 0.34, JPM: 1.0, XOM: 0.61, AMZN: 0.49 },
  { ticker: 'XOM', AAPL: 0.41, MSFT: 0.37, JNJ: 0.27, JPM: 0.61, XOM: 1.0, AMZN: 0.33 },
  { ticker: 'AMZN', AAPL: 0.74, MSFT: 0.8, JNJ: 0.25, JPM: 0.49, XOM: 0.33, AMZN: 1.0 },
]

const rebalanceModes = {
  1: {
    label: 'Monthly',
    returnFactor: 1,
    riskFactor: 1,
    utilityFactor: 1,
  },
  2: {
    label: 'Bi-Monthly',
    returnFactor: 0.992,
    riskFactor: 1.05,
    utilityFactor: 0.97,
  },
  3: {
    label: 'Quarterly',
    returnFactor: 0.985,
    riskFactor: 1.1,
    utilityFactor: 0.94,
  },
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function frontierTopReturn(variance) {
  return 0.04 + 3.5 * variance - 10 * variance * variance
}

const FRONTIER_BASE_VARIANCE = {
  aggressive: 0.067,
  balanced: 0.068,
  conservative: 0.063,
}

function generateFrontierData() {
  const data = []

  for (let i = 1; i <= 5000; i += 1) {
    const ratio = i / 5000
    const variance = 0.04 + ratio * 0.035 + (seededRandom(i * 11) - 0.5) * 0.0012
    const maxReturn = frontierTopReturn(variance)
    const dispersion = seededRandom(i * 17) * 0.035

    data.push({
      variance: Number(variance.toFixed(4)),
      return: Number((maxReturn - dispersion).toFixed(4)),
    })
  }

  return data
}

function pseudoNormal(seedBase) {
  let total = 0
  for (let i = 1; i <= 6; i += 1) {
    total += seededRandom(seedBase * 97 + i * 31)
  }
  return (total - 3) / 0.707
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function ChartFrame({ xLabel, children }) {
  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-950/70 px-4 pb-2 pt-3">
      <div className="relative h-[320px]">
        {children}
      </div>
      <div className="mt-0.5 text-center text-sm text-slate-300">{xLabel}</div>
    </div>
  )
}

function adjustAllocation(baseAllocation, mode) {
  const intensity = mode - 1
  const riskTilt = [0.6, 0.3, -1.2, 0.4, -0.5, 0.8]

  const shifted = baseAllocation.map((weight, index) =>
    clamp(weight - riskTilt[index] * intensity, 4, 35),
  )

  const total = shifted.reduce((sum, value) => sum + value, 0)
  return shifted.map((value) => Number(((value / total) * 100).toFixed(2)))
}

function buildHistogram(values, binCount = 18) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const binSize = (max - min) / binCount

  const bins = Array.from({ length: binCount }, (_, idx) => ({
    bin: `${(min + idx * binSize).toFixed(1)} to ${(min + (idx + 1) * binSize).toFixed(1)}`,
    count: 0,
    mid: Number((min + (idx + 0.5) * binSize).toFixed(2)),
  }))

  values.forEach((value) => {
    const idx = Math.min(Math.floor((value - min) / binSize), binCount - 1)
    bins[idx].count += 1
  })

  return bins
}

function AllocationTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  const item = payload[0].payload

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-sm text-slate-100 shadow-lg">
      <div className="font-semibold text-cyan-200">{item.ticker}</div>
      <div className="text-slate-300">Weight: {Number(item.weight).toFixed(2)}%</div>
    </div>
  )
}

function CenteredYAxisLabel({ viewBox, value }) {
  if (!viewBox) {
    return null
  }

  const { x, y, height } = viewBox
  const labelX = x - 18
  const labelY = y + height / 2

  return (
    <text
      x={labelX}
      y={labelY}
      fill="#94a3b8"
      fontSize={12}
      fontWeight={400}
      textAnchor="middle"
      dominantBaseline="central"
      transform={`rotate(-90, ${labelX}, ${labelY})`}
    >
      {value}
    </text>
  )
}

function computeAdjustedProfiles(mode) {
  const rebalance = rebalanceModes[mode]

  return Object.fromEntries(
    Object.entries(profiles).map(([key, profile]) => {
      const adjustedRisk = Number((profile.risk * rebalance.riskFactor).toFixed(2))
      const adjustedReturn = Number(
        (profile.return * rebalance.returnFactor).toFixed(2),
      )
      const utilityBase = adjustedReturn - profile.lambda * ((adjustedRisk / 10) ** 2) * 0.1

      return [
        key,
        {
          ...profile,
          return: adjustedReturn,
          risk: adjustedRisk,
          utility: Number((utilityBase * rebalance.utilityFactor).toFixed(2)),
          allocation: adjustAllocation(profile.allocation, mode),
        },
      ]
    }),
  )
}

function computeGrowthData(adjustedProfiles) {
  const months = 24

  return Array.from({ length: months + 1 }, (_, month) => {
    const row = { month }

    Object.values(adjustedProfiles).forEach((profile, profileIndex) => {
      let value = 100
      const monthlyMean = profile.return / 100 / 12
      const monthlyVol = profile.risk / 100 / Math.sqrt(12)

      for (let step = 1; step <= month; step += 1) {
        const noise = pseudoNormal((profileIndex + 1) * 1000 + step) * 0.16
        value *= 1 + monthlyMean + monthlyVol * noise
      }

      row[profile.name] = Number(value.toFixed(2))
    })

    return row
  })
}

function computeMonteCarloHistogram(profile) {
  const simulatedReturns = []

  for (let i = 1; i <= 5000; i += 1) {
    const sample =
      profile.return +
      pseudoNormal(i + profile.lambda * 13) * (profile.risk * 0.75)
    simulatedReturns.push(sample)
  }

  return buildHistogram(simulatedReturns)
}

const ADJUSTED_PROFILES_BY_MODE = {
  1: computeAdjustedProfiles(1),
  2: computeAdjustedProfiles(2),
  3: computeAdjustedProfiles(3),
}

const FRONTIER_DATA = generateFrontierData()

const FRONTIER_X_MIN = 0.035
const FRONTIER_X_MAX = 0.09
const FRONTIER_Y_MIN = 0.12
const FRONTIER_Y_MAX = 0.27

const CanvasFrontierPlot = memo(function CanvasFrontierPlot({ optimalPoints }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const width = rect.width
      const height = rect.height
      const pad = { left: 58, right: 24, top: 52, bottom: 44 }
      const xTicks = [0.04, 0.05, 0.06, 0.07, 0.08, 0.09]
      const yTicks = [0.12, 0.15, 0.18, 0.21, 0.24, 0.27]

      const plotWidth = width - pad.left - pad.right
      const plotHeight = height - pad.top - pad.bottom

      const xToPx = (x) =>
        pad.left + ((x - FRONTIER_X_MIN) / (FRONTIER_X_MAX - FRONTIER_X_MIN)) * plotWidth
      const yToPx = (y) =>
        pad.top + (1 - (y - FRONTIER_Y_MIN) / (FRONTIER_Y_MAX - FRONTIER_Y_MIN)) * plotHeight

      ctx.clearRect(0, 0, width, height)

      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])

      for (const x of xTicks) {
        const px = xToPx(x)
        ctx.beginPath()
        ctx.moveTo(px, pad.top)
        ctx.lineTo(px, height - pad.bottom)
        ctx.stroke()
      }

      for (const y of yTicks) {
        const py = yToPx(y)
        ctx.beginPath()
        ctx.moveTo(pad.left, py)
        ctx.lineTo(width - pad.right, py)
        ctx.stroke()
      }

      ctx.setLineDash([])
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(pad.left, pad.top)
      ctx.lineTo(pad.left, height - pad.bottom)
      ctx.lineTo(width - pad.right, height - pad.bottom)
      ctx.stroke()

      ctx.fillStyle = '#94a3b8'
      ctx.font = '12px Manrope, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      for (const x of xTicks) {
        const px = xToPx(x)
        ctx.beginPath()
        ctx.moveTo(px, height - pad.bottom)
        ctx.lineTo(px, height - pad.bottom + 4)
        ctx.stroke()
        ctx.fillText(x.toFixed(2), px, height - pad.bottom + 8)
      }

      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      for (const y of yTicks) {
        const py = yToPx(y)
        ctx.beginPath()
        ctx.moveTo(pad.left - 4, py)
        ctx.lineTo(pad.left, py)
        ctx.stroke()
        ctx.fillText(y.toFixed(2), pad.left - 8, py)
      }

      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)'
      for (const point of FRONTIER_DATA) {
        const x = xToPx(point.variance)
        const y = yToPx(point.return)
        ctx.beginPath()
        ctx.arc(x, y, 1.8, 0, Math.PI * 2)
        ctx.fill()
      }

      optimalPoints.forEach((point, index) => {
        const adjustedVariance = clamp(point.variance, FRONTIER_X_MIN, FRONTIER_X_MAX)
        const adjustedReturn = clamp(point.return, FRONTIER_Y_MIN, FRONTIER_Y_MAX)
        const x = xToPx(adjustedVariance)
        const y = yToPx(adjustedReturn)

        ctx.fillStyle = point.color
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#e2e8f0'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.stroke()
        
        const labelOffsetX = index === 2 ? 10 : -10
        const labelAlign = index === 2 ? 'left' : 'right'
        ctx.fillStyle = '#cbd5e1'
        ctx.font = '11px Manrope, sans-serif'
        ctx.textAlign = labelAlign
        ctx.textBaseline = 'middle'
        ctx.fillText(point.name, x + labelOffsetX, y - 10)
      })

      ctx.fillStyle = '#94a3b8'
      ctx.font = '12px Manrope, sans-serif'
      ctx.save()
      ctx.translate(pad.left - 46, pad.top + plotHeight / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Expected Return', 0, 0)
      ctx.restore()
    }

    draw()

    const resizeObserver = new ResizeObserver(() => draw())
    resizeObserver.observe(canvas)

    return () => {
      resizeObserver.disconnect()
    }
  }, [optimalPoints])

  return <canvas ref={canvasRef} className="h-full w-full" />
})

const EfficientFrontierSection = memo(function EfficientFrontierSection({
  optimalPoints,
  adjustedProfiles,
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-cyan-100">Efficient Frontier</h2>
      <p className="mt-2 text-sm text-slate-400">
        5000 simulated portfolios with profile-optimal portfolios highlighted.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
        {Object.values(adjustedProfiles).map((profile) => (
          <div key={profile.name} className="flex items-center gap-2 text-slate-300">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: profile.color }}
            />
            <span>
              {profile.name} optimal (λ={profile.lambda})
            </span>
          </div>
        ))}
      </div>
      <ChartFrame xLabel="Risk (Variance)">
        <CanvasFrontierPlot optimalPoints={optimalPoints} />
      </ChartFrame>
      <p className="mt-3 text-xs text-slate-400">
        Note: The colored markers are utility-optimal portfolios for the three investor profiles and are plotted on the frontier envelope.
      </p>
    </section>
  )
})

function App() {
  const [activeProfile, setActiveProfile] = useState('balanced')
  const [rebalanceMode, setRebalanceMode] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const reportRef = useRef(null)
  const growthCacheRef = useRef({})
  const monteCarloCacheRef = useRef({})

  const safeMode = rebalanceModes[rebalanceMode] ? rebalanceMode : 1
  const activeRebalance = rebalanceModes[safeMode]
  const adjustedProfiles = ADJUSTED_PROFILES_BY_MODE[safeMode]

  const selectedProfile = adjustedProfiles[activeProfile]

  const allocationData = useMemo(
    () =>
      assets.map((asset, index) => ({
        ...asset,
        weight: selectedProfile.allocation[index],
      })),
    [selectedProfile],
  )

  const optimalPoints = useMemo(
    () =>
      Object.entries(adjustedProfiles).map(([key, profile]) => {
        const variance = Number(
          (
            FRONTIER_BASE_VARIANCE[key] *
            Math.pow(rebalanceModes[safeMode].riskFactor, 2)
          ).toFixed(4),
        )

        return {
          name: profile.name,
          variance,
          return: Number(frontierTopReturn(variance).toFixed(4)),
          color: profile.color,
        }
      }),
    [adjustedProfiles, safeMode],
  )

  const growthData = useMemo(() => {
    if (!growthCacheRef.current[safeMode]) {
      growthCacheRef.current[safeMode] = computeGrowthData(adjustedProfiles)
    }
    return growthCacheRef.current[safeMode]
  }, [adjustedProfiles, safeMode])

  const monteCarloHistogram = useMemo(() => {
    const cacheKey = `${safeMode}-${activeProfile}`
    if (!monteCarloCacheRef.current[cacheKey]) {
      monteCarloCacheRef.current[cacheKey] = computeMonteCarloHistogram(
        selectedProfile,
      )
    }
    return monteCarloCacheRef.current[cacheKey]
  }, [activeProfile, safeMode, selectedProfile])

  async function downloadReport(format) {
    if (!reportRef.current || isExporting) {
      return
    }

    setIsExporting(true)

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#020617',
        scale: 2,
      })

      const imageData = canvas.toDataURL('image/png')

      if (format === 'png') {
        const link = document.createElement('a')
        link.href = imageData
        link.download = 'utility-allocation-report.png'
        link.click()
      } else {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px' })
        const width = pdf.internal.pageSize.getWidth()
        const height = (canvas.height * width) / canvas.width
        pdf.addImage(imageData, 'PNG', 0, 0, width, height)
        pdf.save('utility-allocation-report.pdf')
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-8 lg:px-14">
      <div ref={reportRef} className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-sm sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">
                MIT Manipal | AI + Finance Demo
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
                Utility-Based Portfolio Allocation Agent
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
                An explainable allocation engine that chooses stock weights by
                maximizing expected utility across investor risk profiles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadReport('png')}
                disabled={isExporting}
                className="rounded-full border border-cyan-300/60 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? 'Exporting...' : 'Download PNG Report'}
              </button>
              <button
                onClick={() => downloadReport('pdf')}
                disabled={isExporting}
                className="rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? 'Exporting...' : 'Download PDF Report'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-cyan-100">How It Works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {steps.map((step, index) => (
              <article
                key={step}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <p className="text-xs font-semibold tracking-wider text-cyan-300">
                  STEP {index + 1}
                </p>
                <p className="mt-2 text-sm text-slate-200">{step}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-cyan-100">Asset Overview</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article
                key={asset.ticker}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{asset.ticker}</h3>
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: asset.color }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-900 p-3">
                    <p className="text-slate-400">Expected Return</p>
                    <p className="mt-1 text-base font-semibold text-emerald-300">
                      {asset.expectedReturn}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-3">
                    <p className="text-slate-400">Risk</p>
                    <p className="mt-1 text-base font-semibold text-amber-300">
                      {asset.risk}%
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-cyan-100">
              Portfolio Simulator
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profiles).map(([key, profile]) => (
                <button
                  key={key}
                  onClick={() => setActiveProfile(key)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    activeProfile === key
                      ? 'border-cyan-300 bg-cyan-300/20 text-cyan-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {profile.name} (λ={profile.lambda})
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-300">
                Rebalancing Frequency: <span className="font-semibold text-cyan-200">{activeRebalance.label}</span>
              </p>
              <p className="text-xs text-slate-400">
                Less frequent rebalancing increases drift and volatility.
              </p>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="1"
              value={safeMode}
              onChange={(event) =>
                setRebalanceMode(
                  Math.round(clamp(Number(event.target.value), 1, 3)),
                )
              }
              className="mt-3 w-full accent-cyan-300"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Monthly</span>
              <span>Bi-Monthly</span>
              <span>Quarterly</span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="mb-3 text-sm uppercase tracking-wider text-slate-400">
                Allocation Donut
              </h3>
              <p className="mb-2 text-xs text-slate-400">
                Metric: asset weight share (% of total portfolio).
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="weight"
                      nameKey="ticker"
                      innerRadius={58}
                      outerRadius={94}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {allocationData.map((entry) => (
                        <Cell key={entry.ticker} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="mb-3 text-sm uppercase tracking-wider text-slate-400">
                Allocation Bar Chart
              </h3>
              <ChartFrame xLabel="Asset">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocationData} margin={{ top: 10, right: 20, left: 26, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="ticker" stroke="#94a3b8" />
                    <YAxis
                      stroke="#94a3b8"
                      unit="%"
                      width={64}
                      label={<CenteredYAxisLabel value="Allocation Weight (%)" />}
                    />
                    <Tooltip formatter={(value) => [`${value}%`, 'Weight']} />
                    <Bar
                      dataKey="weight"
                      radius={[8, 8, 0, 0]}
                      isAnimationActive={false}
                    >
                      {allocationData.map((entry) => (
                        <Cell key={entry.ticker} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </article>
          </div>
        </section>

        <EfficientFrontierSection
          optimalPoints={optimalPoints}
          adjustedProfiles={adjustedProfiles}
        />

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-cyan-100">Correlation Heatmap</h2>
          <p className="mt-2 text-sm text-slate-400">
            Hardcoded pairwise correlation matrix for the six selected equities (X axis: column ticker, Y axis: row ticker).
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-2 text-center text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-slate-400">Asset</th>
                  {assets.map((asset) => (
                    <th key={asset.ticker} className="px-3 py-2 text-slate-300">
                      {asset.ticker}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlationMatrix.map((row) => (
                  <tr key={row.ticker}>
                    <td className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 font-semibold text-slate-200">
                      {row.ticker}
                    </td>
                    {assets.map((asset) => {
                      const value = row[asset.ticker]
                      const colorStrength = Math.round((value + 1) * 50)
                      return (
                        <td
                          key={`${row.ticker}-${asset.ticker}`}
                          className="rounded-lg border border-slate-800 px-3 py-2 font-medium text-slate-100"
                          style={{
                            backgroundColor: `hsl(${190 - colorStrength}, 65%, ${18 + colorStrength * 0.3}%)`,
                          }}
                        >
                          {value.toFixed(2)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-cyan-100">Cumulative Growth</h2>
          <p className="mt-2 text-sm text-slate-400">
            Simulated growth of $100 over 24 months under each investor profile.
          </p>
          <ChartFrame xLabel="Month">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={growthData}
                margin={{ top: 10, right: 20, left: 26, bottom: 12 }}
              >
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis
                  stroke="#94a3b8"
                  width={64}
                  label={<CenteredYAxisLabel value="Portfolio Value (Base = 100)" />}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={30} />
                {Object.values(adjustedProfiles).map((profile) => (
                  <Line
                    key={profile.name}
                    type="monotone"
                    dataKey={profile.name}
                    stroke={profile.color}
                    strokeWidth={2.3}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-cyan-100">Monte Carlo Return Distribution</h2>
          <p className="mt-2 text-sm text-slate-400">
            5000 simulated one-year outcomes for the active profile ({selectedProfile.name}).
          </p>
          <ChartFrame xLabel="Simulated Annual Return (%)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monteCarloHistogram}
                margin={{ top: 10, right: 20, left: 26, bottom: 12 }}
              >
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="mid" stroke="#94a3b8" unit="%" />
                <YAxis
                  stroke="#94a3b8"
                  width={64}
                  label={<CenteredYAxisLabel value="Number of Portfolios" />}
                />
                <Tooltip formatter={(value) => [value, 'Portfolios']} />
                <Bar dataKey="count" fill={selectedProfile.color} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-cyan-100">
            Profile Comparison
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {Object.values(adjustedProfiles).map((profile) => (
              <article
                key={profile.name}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{profile.name}</h3>
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: profile.color }}
                  />
                </div>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="rounded-xl bg-slate-900 p-3">
                    <dt className="text-slate-400">Expected Return</dt>
                    <dd className="mt-1 text-base font-semibold text-emerald-300">
                      {profile.return}%
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-3">
                    <dt className="text-slate-400">Risk</dt>
                    <dd className="mt-1 text-base font-semibold text-amber-300">
                      {profile.risk}%
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-3">
                    <dt className="text-slate-400">Utility Score</dt>
                    <dd className="mt-1 text-base font-semibold text-cyan-200">
                      {profile.utility}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
