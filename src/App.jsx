import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
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
  { ticker: 'AAPL', sector: 'Technology', expectedReturn: 12.8, risk: 17.4, color: '#fb7185' },
  { ticker: 'MSFT', sector: 'Technology', expectedReturn: 11.9, risk: 15.1, color: '#f97316' },
  { ticker: 'JNJ', sector: 'Healthcare', expectedReturn: 8.2, risk: 8.4, color: '#f59e0b' },
  { ticker: 'JPM', sector: 'Financials', expectedReturn: 10.2, risk: 14.3, color: '#22c55e' },
  { ticker: 'XOM', sector: 'Energy', expectedReturn: 9.1, risk: 12.2, color: '#ef4444' },
  { ticker: 'AMZN', sector: 'Consumer Discretionary', expectedReturn: 14.5, risk: 21.5, color: '#e879f9' },
]

const sectorStyles = {
  Technology: {
    badge: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
  },
  Healthcare: {
    badge: 'border-orange-400/30 bg-orange-400/10 text-orange-100',
  },
  Financials: {
    badge: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  },
  Energy: {
    badge: 'border-red-400/30 bg-red-400/10 text-red-100',
  },
  'Consumer Discretionary': {
    badge: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100',
  },
}

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
    <div className="relative rounded-2xl border border-rose-500/15 bg-[#090408]/70 px-4 pb-2 pt-3">
      <div className="relative h-[320px]">
        {children}
      </div>
      <div
        className="mt-0.5 text-center"
        style={{
          color: '#e2e8f0',
          fontSize: '14px',
          fontFamily: 'Manrope, sans-serif',
          fontWeight: 500,
        }}
      >
        {xLabel}
      </div>
    </div>
  )
}

function SectionHeading({ title, subtitle, accentClass = 'border-rose-400' }) {
  return (
    <div className={`mb-5 border-l-4 ${accentClass} pl-4`}>
      <h2 className="text-3xl font-semibold tracking-tight text-rose-50 sm:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-2 text-sm text-slate-300">{subtitle}</p> : null}
      <div className="mt-3 h-px w-full bg-gradient-to-r from-rose-400/70 via-rose-400/20 to-transparent" />
    </div>
  )
}

function ExportButton({ label, exporting, onClick, tone = 'primary' }) {
  const isPrimary = tone === 'primary'

  return (
    <button
      onClick={onClick}
      disabled={exporting}
      className={
        isPrimary
          ? 'inline-flex items-center gap-2 rounded-full border border-rose-300/35 bg-gradient-to-r from-rose-500/25 via-orange-500/15 to-red-500/20 px-4 py-2 text-sm font-medium text-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.18)] transition hover:border-rose-200/60 hover:from-rose-500/35 hover:to-red-500/30 disabled:cursor-not-allowed disabled:opacity-60'
          : 'inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-[#1a0a10]/85 px-4 py-2 text-sm font-medium text-rose-50 shadow-[0_0_0_1px_rgba(244,63,94,0.08)] transition hover:border-rose-200/40 hover:bg-[#211016] disabled:cursor-not-allowed disabled:opacity-60'
      }
    >
      <span
        className={
          exporting
            ? 'h-3 w-3 animate-spin rounded-full border border-rose-100/30 border-t-rose-100'
            : isPrimary
              ? 'h-2.5 w-2.5 rounded-full bg-rose-200 shadow-[0_0_12px_rgba(251,113,133,0.5)]'
              : 'h-2.5 w-2.5 rounded-full bg-orange-200 shadow-[0_0_12px_rgba(251,146,60,0.35)]'
        }
      />
      <span>{exporting ? 'Exporting...' : label}</span>
    </button>
  )
}

function MiniBars({ expectedReturn, risk, color }) {
  const returnWidth = clamp((expectedReturn / 16) * 100, 34, 100)
  const riskWidth = clamp((risk / 24) * 100, 34, 100)

  return (
    <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-slate-500">
        <span>Return</span>
        <span>Risk</span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-10 text-[11px] text-slate-400">Ret</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800/80">
            <div className="h-full rounded-full" style={{ width: `${returnWidth}%`, backgroundColor: color }} />
          </div>
          <span className="w-12 text-right text-[11px] text-slate-200">{expectedReturn}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 text-[11px] text-slate-400">Rsk</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800/80">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500" style={{ width: `${riskWidth}%` }} />
          </div>
          <span className="w-12 text-right text-[11px] text-slate-200">{risk}%</span>
        </div>
      </div>
    </div>
  )
}

function getCorrelationCellStyle(value) {
  const start = { r: 37, g: 99, b: 235 }
  const mid = { r: 248, g: 250, b: 252 }
  const end = { r: 234, g: 88, b: 12 }
  const normalized = clamp((value - 0.25) / 0.75, 0, 1)

  const mix = normalized < 0.5
    ? {
        r: Math.round(start.r + (mid.r - start.r) * (normalized / 0.5)),
        g: Math.round(start.g + (mid.g - start.g) * (normalized / 0.5)),
        b: Math.round(start.b + (mid.b - start.b) * (normalized / 0.5)),
      }
    : {
        r: Math.round(mid.r + (end.r - mid.r) * ((normalized - 0.5) / 0.5)),
        g: Math.round(mid.g + (end.g - mid.g) * ((normalized - 0.5) / 0.5)),
        b: Math.round(mid.b + (end.b - mid.b) * ((normalized - 0.5) / 0.5)),
      }

  const luminance = (0.2126 * mix.r + 0.7152 * mix.g + 0.0722 * mix.b) / 255

  return {
    backgroundColor: `rgb(${mix.r}, ${mix.g}, ${mix.b})`,
    color: luminance > 0.66 ? '#020617' : '#f8fafc',
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.08)',
  }
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
      fill="#e2e8f0"
      fontSize={14}
      fontFamily="Manrope, sans-serif"
      fontWeight={500}
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

const AXIS_TICK_STYLE = {
  fill: '#94a3b8',
  fontSize: 12,
  fontFamily: 'Manrope, sans-serif',
  fontWeight: 400,
}

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

      const plottedOptimalPoints = optimalPoints.map((point) => {
        const adjustedVariance = clamp(point.variance, FRONTIER_X_MIN, FRONTIER_X_MAX)
        const adjustedReturn = clamp(point.return, FRONTIER_Y_MIN, FRONTIER_Y_MAX)

        return {
          ...point,
          x: xToPx(adjustedVariance),
          y: yToPx(adjustedReturn),
        }
      })

      plottedOptimalPoints.forEach((point) => {
        ctx.save()
        ctx.shadowColor = point.color
        ctx.shadowBlur = 18
        ctx.fillStyle = point.color
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.strokeStyle = '#e2e8f0'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(point.x, point.y, 9.5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      })

      ctx.fillStyle = '#e2e8f0'
      ctx.font = '500 14px Manrope, sans-serif'
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
    <section className="rounded-3xl border border-rose-500/15 bg-[#12070b]/76 p-6 shadow-[0_0_0_1px_rgba(244,63,94,0.05)] sm:p-8">
      <SectionHeading
        title="Efficient Frontier"
        subtitle="The three optimized portfolios are emphasized with larger glowing markers."
        accentClass="border-rose-500"
      />
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(190,18,60,0.22),_transparent_34%),linear-gradient(180deg,_#1a0810_0%,_#0a0508_58%,_#050305_100%)] px-5 py-12 text-slate-100 sm:px-8 lg:px-14">
      <div ref={reportRef} className="mx-auto flex w-full max-w-7xl flex-col gap-12">
        <section className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-[#14070d]/78 p-8 shadow-[0_0_0_1px_rgba(244,63,94,0.08)] backdrop-blur-sm sm:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl" />
            <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(244,63,94,0.14)_1px,transparent_0)] [background-size:18px_18px] opacity-35" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="relative max-w-3xl">
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">
                The Rational Agents
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
                Utility-Based Portfolio Allocation Agent
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
                An explainable allocation engine that chooses stock weights by
                maximizing expected utility across investor risk profiles.
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              <ExportButton
                label="Download PNG Report"
                exporting={isExporting}
                onClick={() => downloadReport('png')}
                tone="primary"
              />
              <ExportButton
                label="Download PDF Report"
                exporting={isExporting}
                onClick={() => downloadReport('pdf')}
                tone="secondary"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-500/15 bg-[#12070b]/76 p-6 shadow-[0_0_0_1px_rgba(244,63,94,0.05)] sm:p-8">
          <SectionHeading
            title="How It Works"
            subtitle="A short pipeline showing how the model turns market data into a portfolio decision."
            accentClass="border-orange-400"
          />
          <div className="relative mt-8">
            <div className="pointer-events-none absolute left-4 right-4 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-rose-300/35 to-transparent md:block" />
            <div className="grid gap-4 md:grid-cols-5">
            {steps.map((step, index) => (
              <article
                key={step}
                className="relative rounded-2xl border border-rose-500/10 bg-[#0d0608]/80 p-4 shadow-[0_0_0_1px_rgba(244,63,94,0.04)]"
              >
                <p className="text-xs font-semibold tracking-wider text-cyan-300">
                  STEP {index + 1}
                </p>
                <p className="mt-2 text-sm text-slate-200">{step}</p>
              </article>
            ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-500/15 bg-[#12070b]/76 p-6 shadow-[0_0_0_1px_rgba(244,63,94,0.05)] sm:p-8">
          <SectionHeading
            title="Asset Overview"
            subtitle="Each card now carries a sector tag and a tiny return-vs-risk view for quicker scanning."
            accentClass="border-rose-500"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article
                key={asset.ticker}
                className="rounded-2xl border border-rose-500/12 bg-[#0c0507]/85 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-rose-400/25"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-rose-50">{asset.ticker}</h3>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{asset.sector}</p>
                  </div>
                  <span className="h-3.5 w-3.5 rounded-full ring-4 ring-white/5" style={{ backgroundColor: asset.color }} />
                </div>
                <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${sectorStyles[asset.sector]?.badge ?? 'border-slate-500/20 bg-slate-500/10 text-slate-100'}`}>
                  {asset.sector}
                </div>
                <MiniBars expectedReturn={asset.expectedReturn} risk={asset.risk} color={asset.color} />
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-slate-400">Expected Return</p>
                    <p className="mt-1 text-base font-semibold text-emerald-300">
                      {asset.expectedReturn}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
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

        <section className="rounded-3xl border border-rose-500/15 bg-[#12070b]/76 p-6 shadow-[0_0_0_1px_rgba(244,63,94,0.05)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionHeading
              title="Portfolio Simulator"
              subtitle="Switch the profile and rebalance frequency to see the allocation change."
              accentClass="border-orange-400"
            />
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

          <div className="mt-5 rounded-2xl border border-rose-500/10 bg-[#0d0608]/85 p-4">
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
            <article className="rounded-2xl border border-rose-500/10 bg-[#0d0608]/85 p-4">
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

            <article className="rounded-2xl border border-rose-500/10 bg-[#0d0608]/85 p-4">
              <h3 className="mb-3 text-sm uppercase tracking-wider text-slate-400">
                Allocation Bar Chart
              </h3>
              <ChartFrame xLabel="Asset">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocationData} margin={{ top: 10, right: 20, left: 26, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="ticker" stroke="#94a3b8" tick={AXIS_TICK_STYLE} />
                    <YAxis
                      stroke="#94a3b8"
                      tick={AXIS_TICK_STYLE}
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

        <section className="rounded-3xl border border-rose-500/15 bg-[#12070b]/76 p-6 shadow-[0_0_0_1px_rgba(244,63,94,0.05)] sm:p-8">
          <SectionHeading
            title="Correlation Heatmap"
            subtitle="A diverging blue-to-red scale makes the matrix easier to read and less misleading."
            accentClass="border-rose-400"
          />
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
                          className="rounded-lg border border-slate-800 px-3 py-2 font-semibold"
                          style={getCorrelationCellStyle(value)}
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

        <section className="rounded-3xl border border-rose-500/15 bg-[#12070b]/76 p-6 shadow-[0_0_0_1px_rgba(244,63,94,0.05)] sm:p-8">
          <SectionHeading
            title="Cumulative Growth"
            subtitle="Thicker lines and soft area fills make the growth curves easier to compare at a glance."
            accentClass="border-orange-400"
          />
          <p className="mt-2 text-sm text-slate-400">
            Simulated growth of $100 over 24 months under each investor profile.
          </p>
          <ChartFrame xLabel="Month">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={growthData}
                margin={{ top: 10, right: 20, left: 26, bottom: 12 }}
              >
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={AXIS_TICK_STYLE} />
                <YAxis
                  stroke="#94a3b8"
                  tick={AXIS_TICK_STYLE}
                  width={64}
                  label={<CenteredYAxisLabel value="Portfolio Value (Base = 100)" />}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={30} />
                {Object.values(adjustedProfiles).map((profile) => (
                  <Area
                    key={profile.name}
                    type="monotone"
                    dataKey={profile.name}
                    stroke={profile.color}
                    strokeWidth={2.6}
                    fill={profile.color}
                    fillOpacity={0.16}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </section>

        <section className="rounded-3xl border border-rose-500/15 bg-[#12070b]/76 p-6 shadow-[0_0_0_1px_rgba(244,63,94,0.05)] sm:p-8">
          <SectionHeading
            title="Monte Carlo Return Distribution"
            subtitle="Histogram bars highlight the spread of simulated annual outcomes for the active profile."
            accentClass="border-rose-500"
          />
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
                <XAxis dataKey="mid" stroke="#94a3b8" tick={AXIS_TICK_STYLE} unit="%" />
                <YAxis
                  stroke="#94a3b8"
                  tick={AXIS_TICK_STYLE}
                  width={64}
                  label={<CenteredYAxisLabel value="Number of Portfolios" />}
                />
                <Tooltip formatter={(value) => [value, 'Portfolios']} />
                <Bar dataKey="count" fill={selectedProfile.color} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </section>

        <section className="rounded-3xl border border-rose-500/15 bg-[#12070b]/76 p-6 shadow-[0_0_0_1px_rgba(244,63,94,0.05)] sm:p-8">
          <SectionHeading
            title="Profile Comparison"
            subtitle="Risk, return, and utility are compared side by side for the three investor styles."
            accentClass="border-orange-400"
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {Object.values(adjustedProfiles).map((profile) => (
              <article
                key={profile.name}
                className="rounded-2xl border border-rose-500/12 bg-[#0c0507]/85 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight text-rose-50">{profile.name}</h3>
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
