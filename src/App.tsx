import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { electricityRepository } from './data/electricityRepository'
import type { ElectricityEntry } from './data/electricityRepository'
import './App.css'

function getLocalDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getLocalTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function formatMoney(value: number, digits = 2) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatUnit(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatMeterReading(value: number) {
  return Number.isFinite(value) ? String(value) : '-'
}

function formatDate(date: string) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatChartDate(date: string) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T00:00:00`))
}

type ThaiDatePickerProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label: string
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const THAI_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function parseDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
}

function toDateValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function ThaiDatePicker({ value, onChange, disabled = false, label }: ThaiDatePickerProps) {
  const selected = parseDateParts(value)
  const todayParts = parseDateParts(getLocalDate())!
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selected?.year ?? todayParts.year)
  const [viewMonth, setViewMonth] = useState(selected?.month ?? todayParts.month)
  const toggleCalendar = () => {
    if (disabled) return
    if (!open && selected) {
      setViewYear(selected.year)
      setViewMonth(selected.month)
    }
    setOpen((current) => !current)
  }

  const shiftMonth = (amount: number) => {
    const next = new Date(viewYear, viewMonth + amount, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  const chooseDay = (day: number) => {
    onChange(toDateValue(viewYear, viewMonth, day))
    setOpen(false)
  }

  const chooseToday = () => {
    setViewYear(todayParts.year)
    setViewMonth(todayParts.month)
    onChange(toDateValue(todayParts.year, todayParts.month, todayParts.day))
    setOpen(false)
  }

  return (
    <div className={`thai-date-picker ${disabled ? 'disabled' : ''}`}>
      <button
        type="button"
        className="thai-date-button"
        onClick={toggleCalendar}
        disabled={disabled}
        aria-label={label}
        aria-expanded={open}
      >
        <span className="thai-date-icon">▣</span>
        <strong>{value ? formatDate(value) : 'เลือกวันที่'}</strong>
        <span className="thai-date-chevron">⌄</span>
      </button>

      {open && !disabled && (
        <div className="thai-calendar-popover" role="dialog" aria-label={`ปฏิทิน ${label}`}>
          <div className="thai-calendar-header">
            <button type="button" className="calendar-nav" onClick={() => shiftMonth(-1)} aria-label="เดือนก่อนหน้า">‹</button>
            <div className="calendar-month-title">
              <strong>{THAI_MONTHS[viewMonth]}</strong>
              <span>พ.ศ. {viewYear + 543}</span>
            </div>
            <button type="button" className="calendar-nav" onClick={() => shiftMonth(1)} aria-label="เดือนถัดไป">›</button>
          </div>

          <div className="thai-calendar-weekdays">
            {THAI_WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="thai-calendar-grid">
            {calendarCells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} className="calendar-blank" />
              const isSelected = selected?.year === viewYear && selected.month === viewMonth && selected.day === day
              const isToday = todayParts.year === viewYear && todayParts.month === viewMonth && todayParts.day === day
              return (
                <button
                  type="button"
                  key={day}
                  className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => chooseDay(day)}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <div className="thai-calendar-footer">
            <button type="button" onClick={chooseToday}>วันนี้</button>
            <button type="button" onClick={() => setOpen(false)}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  )
}

function monthKey(date: string) {
  return date.slice(0, 7)
}

function findLatestEntry(entries: ElectricityEntry[]) {
  return [...entries]
    .filter((entry) => entry.endDate)
    .sort((a, b) => `${b.endDate} ${b.endTime || ''}`.localeCompare(`${a.endDate} ${a.endTime || ''}`))[0]
}

function toDateTime(date: string, time: string) {
  if (!date || !time) return null
  const value = new Date(`${date}T${time}:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

function getDurationHours(entry: Pick<ElectricityEntry, 'startDate' | 'startTime' | 'endDate' | 'endTime'>) {
  const start = toDateTime(entry.startDate, entry.startTime)
  const end = toDateTime(entry.endDate, entry.endTime)
  if (!start || !end) return 0
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
}

function formatDuration(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return '–'
  const totalMinutes = Math.round(hours * 60)
  const days = Math.floor(totalMinutes / 1440)
  const remainingMinutes = totalMinutes % 1440
  const wholeHours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} วัน`)
  if (wholeHours > 0) parts.push(`${wholeHours} ชม.`)
  if (minutes > 0) parts.push(`${minutes} นาที`)
  return parts.join(' ') || '0 ชม.'
}

type LineChartProps = {
  entries: ElectricityEntry[]
  valueOf: (entry: ElectricityEntry) => number
  valueFormatter: (value: number) => string
  variant?: 'purple' | 'amber'
}

function CombinedLineChart({ entries }: { entries: ElectricityEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(340)
  const height = 220
  const left = 28
  const right = 18
  const top = 28
  const bottom = 38

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const updateWidth = () => setWidth(Math.max(280, Math.floor(element.clientWidth)))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const unitValues = entries.map((entry) => entry.endUnit - entry.startUnit)
  const costValues = entries.map((entry) => (entry.endUnit - entry.startUnit) * entry.rate)
  const maxUnit = Math.max(1, ...unitValues)
  const maxCost = Math.max(1, ...costValues)
  const labelStep = entries.length > 7 ? 2 : 1

  const unitPoints = entries.map((entry, index) => {
    const x = entries.length === 1 ? left + chartWidth / 2 : left + (index / (entries.length - 1)) * chartWidth
    const value = unitValues[index]
    const y = top + chartHeight - (value / maxUnit) * chartHeight
    return { entry, index, x, y, value }
  })
  const costPoints = entries.map((entry, index) => {
    const x = entries.length === 1 ? left + chartWidth / 2 : left + (index / (entries.length - 1)) * chartWidth
    const value = costValues[index]
    const y = top + chartHeight - (value / maxCost) * chartHeight
    return { entry, index, x, y, value }
  })

  return (
    <div className="combined-chart" ref={containerRef}>
      <div className="combined-chart-legend">
        <span><i className="legend-dot purple-dot" />หน่วย (kWh)</span>
        <span><i className="legend-dot amber-dot" />ค่าใช้จ่าย (บาท)</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="กราฟหน่วยและค่าใช้จ่าย">
        {[0, 1, 2, 3].map((grid) => {
          const y = top + (grid / 3) * chartHeight
          return <line key={grid} className="chart-grid-line" x1={left} y1={y} x2={width - right} y2={y} />
        })}
        {unitPoints.length > 1 && <polyline className="combined-unit-line" points={unitPoints.map((point) => `${point.x},${point.y}`).join(' ')} />}
        {costPoints.length > 1 && <polyline className="combined-cost-line" points={costPoints.map((point) => `${point.x},${point.y}`).join(' ')} />}
        {unitPoints.map((point) => {
          const showLabel = point.index % labelStep === 0 || point.index === unitPoints.length - 1
          return (
            <g key={`unit-${point.entry.id}`}>
              <circle className="combined-unit-point" cx={point.x} cy={point.y} r="4" />
              {showLabel && <text className="combined-unit-value" x={point.x} y={Math.max(13, point.y - 9)} textAnchor="middle">{formatUnit(point.value)}</text>}
            </g>
          )
        })}
        {costPoints.map((point) => {
          const showLabel = point.index % labelStep === 0 || point.index === costPoints.length - 1
          return (
            <g key={`cost-${point.entry.id}`}>
              <circle className="combined-cost-point" cx={point.x} cy={point.y} r="4" />
              {showLabel && <text className="combined-cost-value" x={point.x} y={Math.min(height - bottom - 4, point.y + 13)} textAnchor="middle">฿{formatMoney(point.value, 0)}</text>}
              {showLabel && <text className="line-date" x={point.x} y={height - 10} textAnchor="middle">{formatChartDate(point.entry.endDate)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function LineChart({ entries, valueOf, valueFormatter, variant = 'purple' }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const height = 250
  const left = 34
  const right = 24
  const top = 30
  const bottom = 46

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const updateWidth = () => setWidth(Math.max(280, Math.floor(element.clientWidth)))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const values = entries.map(valueOf)
  const maxValue = Math.max(1, ...values)
  const labelStep = width < 430 || entries.length > 10 ? 2 : 1

  const points = entries.map((entry, index) => {
    const x = entries.length === 1 ? left + chartWidth / 2 : left + (index / (entries.length - 1)) * chartWidth
    const value = valueOf(entry)
    const y = top + chartHeight - (value / maxValue) * chartHeight
    return { entry, x, y, value, index }
  })

  return (
    <div className="line-chart-scroll" ref={containerRef}>
      <svg className={`line-chart-svg ${variant === 'amber' ? 'amber-line' : ''}`} viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="กราฟเส้นรายวัน">
        {[0, 1, 2, 3].map((grid) => {
          const y = top + (grid / 3) * chartHeight
          return <line key={grid} className="chart-grid-line" x1={left} y1={y} x2={width - right} y2={y} />
        })}
        {points.length > 1 && <polyline className="line-series" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />}
        {points.map((point) => {
          const showLabel = point.index % labelStep === 0 || point.index === points.length - 1
          return (
            <g key={point.entry.id}>
              <circle className="line-point-halo" cx={point.x} cy={point.y} r="8" />
              <circle className="line-point" cx={point.x} cy={point.y} r="4.5" />
              {showLabel && <text className="line-value" x={point.x} y={Math.max(16, point.y - 13)} textAnchor="middle">{valueFormatter(point.value)}</text>}
              {showLabel && <text className="line-date" x={point.x} y={height - 14} textAnchor="middle">{formatChartDate(point.entry.endDate)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function App() {
  const today = getLocalDate()
  const nowTime = getLocalTime()
  const [entries, setEntries] = useState<ElectricityEntry[]>(electricityRepository.getCachedEntries)
  const [startDate, setStartDate] = useState(today)
  const [startTime, setStartTime] = useState(nowTime)
  const [startUnit, setStartUnit] = useState('')
  const [endDate, setEndDate] = useState(today)
  const [endTime, setEndTime] = useState(nowTime)
  const [endUnit, setEndUnit] = useState('')
  const [rate, setRate] = useState('4.80')
  const [continuationMode, setContinuationMode] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [error, setError] = useState('')
  const [storageMode, setStorageMode] = useState<'loading' | 'remote' | 'cache'>('loading')

  useEffect(() => {
    let mounted = true
    electricityRepository.list().then((result) => {
      if (!mounted) return
      setEntries(result.entries)
      setStorageMode(result.source)

      const latest = findLatestEntry(result.entries)
      if (latest) {
        const currentDate = getLocalDate()
        const currentTime = getLocalTime()
        setStartDate(latest.endDate || currentDate)
        setStartTime(latest.endTime || '')
        setStartUnit(String(latest.endUnit))
        setRate(String(latest.rate || 4.8))

        const latestAt = toDateTime(latest.endDate, latest.endTime)
        const nowAt = toDateTime(currentDate, currentTime)
        if (latestAt && nowAt && nowAt > latestAt) {
          setEndDate(currentDate)
          setEndTime(currentTime)
        } else {
          setEndDate(latest.endDate || currentDate)
          setEndTime(latest.endTime || currentTime)
        }
      }
    })
    return () => { mounted = false }
  }, [])

  const usedUnit = Math.max(0, Number(endUnit || 0) - Number(startUnit || 0))
  const estimatedCost = usedUnit * Number(rate || 0)
  const currentDurationHours = getDurationHours({ startDate, startTime, endDate, endTime })
  const currentDurationDays = currentDurationHours / 24

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => `${b.endDate} ${b.endTime}`.localeCompare(`${a.endDate} ${a.endTime}`)),
    [entries],
  )
  const latestEntry = sortedEntries[0]
  const earliestEntry = sortedEntries[sortedEntries.length - 1]
  const continuationHasLatest = Boolean(continuationMode && !editingId && latestEntry)
  const continuationReady = Boolean(
    continuationHasLatest && latestEntry?.endDate && latestEntry?.endTime,
  )

  const filteredEntries = useMemo(() => sortedEntries.filter((entry) => {
    if (filterStart && entry.endDate < filterStart) return false
    if (filterEnd && entry.endDate > filterEnd) return false
    return true
  }), [sortedEntries, filterStart, filterEnd])

  const thisMonthEntries = entries.filter((entry) => monthKey(entry.endDate) === monthKey(today))
  const sumUnits = (items: ElectricityEntry[]) => items.reduce((sum, entry) => sum + (entry.endUnit - entry.startUnit), 0)
  const sumCost = (items: ElectricityEntry[]) => items.reduce((sum, entry) => sum + (entry.endUnit - entry.startUnit) * entry.rate, 0)
  const sumHours = (items: ElectricityEntry[]) => items.reduce((sum, entry) => sum + getDurationHours(entry), 0)

  const monthUnits = sumUnits(thisMonthEntries)
  const monthCost = sumCost(thisMonthEntries)
  const monthHours = sumHours(thisMonthEntries)
  const totalUnits = sumUnits(entries)
  const totalCost = sumCost(entries)

  const applyContinuationStart = (baseEntry?: ElectricityEntry) => {
    const base = baseEntry ?? latestEntry
    const currentDate = getLocalDate()
    const currentTime = getLocalTime()

    if (base) {
      setContinuationMode(true)
      setStartDate(base.endDate || currentDate)
      setStartTime(base.endTime || '')
      setStartUnit(String(base.endUnit))
      setRate(String(base.rate || 4.8))

      const baseAt = toDateTime(base.endDate, base.endTime)
      const nowAt = toDateTime(currentDate, currentTime)
      if (baseAt && nowAt && nowAt > baseAt) {
        setEndDate(currentDate)
        setEndTime(currentTime)
      } else {
        setEndDate(base.endDate || currentDate)
        setEndTime(base.endTime || currentTime)
      }
    } else {
      setContinuationMode(false)
      setStartDate(currentDate)
      setStartTime(currentTime)
      setStartUnit('')
      setEndDate(currentDate)
      setEndTime(currentTime)
      setRate('4.80')
    }

    setEndUnit('')
    setEditingId(null)
    setError('')
  }

  const resetForm = () => {
    applyContinuationStart()
  }

  const startManualMode = () => {
    const currentDate = getLocalDate()
    const currentTime = getLocalTime()
    setContinuationMode(false)
    setStartDate(currentDate)
    setStartTime(currentTime)
    setStartUnit('')
    setEndDate(currentDate)
    setEndTime(currentTime)
    setEndUnit('')
    setEditingId(null)
    setError('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const start = Number(startUnit)
    const end = Number(endUnit)
    const unitRate = Number(rate)
    const startAt = toDateTime(startDate, startTime)
    const endAt = toDateTime(endDate, endTime)

    if (!startDate || !startTime || !endDate || !endTime || startUnit === '' || endUnit === '' || rate === '') {
      setError('กรุณากรอกข้อมูลจุดเริ่มต้นและจุดสิ้นสุดให้ครบถ้วน')
      return
    }
    if (!startAt || !endAt || endAt <= startAt) {
      setError('วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่มต้น')
      return
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(unitRate)) {
      setError('กรุณากรอกตัวเลขให้ถูกต้อง')
      return
    }
    if (end < start) {
      setError('หน่วยจบต้องไม่น้อยกว่าหน่วยเริ่ม')
      return
    }
    if (unitRate < 0) {
      setError('ราคาต่อหน่วยต้องไม่ติดลบ')
      return
    }
    if (continuationReady && latestEntry) {
      const isContinuous = startDate === latestEntry.endDate
        && startTime === latestEntry.endTime
        && start === latestEntry.endUnit
      if (!isContinuous) {
        setError('จุดเริ่มต้นไม่ตรงกับค่าล่าสุด กรุณากด “ใช้ค่าล่าสุดต่อ” หรือเลือกกำหนดจุดเริ่มเอง')
        return
      }
    }

    const item: ElectricityEntry = {
      id: editingId ?? crypto.randomUUID(),
      startDate,
      startTime,
      endDate,
      endTime,
      startUnit: start,
      endUnit: end,
      rate: unitRate,
    }

    const next = editingId
      ? entries.map((entry) => entry.id === editingId ? item : entry)
      : [...entries, item]
    const nextLatest = findLatestEntry(next)

    setEntries(next)
    try {
      const source = await electricityRepository.upsert(item)
      setStorageMode(source)
      applyContinuationStart(nextLatest)
    } catch {
      setStorageMode('cache')
      setError('บันทึกสำรองในเครื่องแล้ว แต่ยังส่งขึ้น Google Sheet ไม่สำเร็จ')
    }
  }

  const handleEdit = (entry: ElectricityEntry) => {
    setContinuationMode(false)
    setEditingId(entry.id)
    setStartDate(entry.startDate || today)
    setStartTime(entry.startTime || getLocalTime())
    setStartUnit(String(entry.startUnit))
    setEndDate(entry.endDate || today)
    setEndTime(entry.endTime || getLocalTime())
    setEndUnit(String(entry.endUnit))
    setRate(String(entry.rate))
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return
    const nextEntries = entries.filter((entry) => entry.id !== id)
    const removedLatest = latestEntry?.id === id
    setEntries(nextEntries)
    try {
      const source = await electricityRepository.remove(id)
      setStorageMode(source)
    } catch {
      setStorageMode('cache')
      window.alert('ลบข้อมูลในเครื่องแล้ว แต่ยังซิงก์การลบไป Google Sheet ไม่สำเร็จ')
    }

    if (editingId === id || (removedLatest && continuationMode)) {
      const nextLatest = findLatestEntry(nextEntries)
      if (nextLatest) applyContinuationStart(nextLatest)
      else startManualMode()
    }
  }

  const exportCsv = () => {
    const rows = [
      ['วันที่เริ่ม', 'เวลาเริ่ม', 'หน่วยเริ่ม', 'วันที่จบ', 'เวลาจบ', 'หน่วยจบ', 'ระยะเวลา(ชั่วโมง)', 'หน่วยที่ใช้', 'ราคาต่อหน่วย', 'ค่าไฟรวม'],
      ...filteredEntries.map((entry) => {
        const used = entry.endUnit - entry.startUnit
        return [entry.startDate, entry.startTime, entry.startUnit, entry.endDate, entry.endTime, entry.endUnit, getDurationHours(entry), used, entry.rate, used * entry.rate]
      }),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `electricity-log-${today}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const chartEntries = useMemo(
    () => [...filteredEntries].filter((entry) => entry.endDate).sort((a, b) => `${a.endDate} ${a.endTime}`.localeCompare(`${b.endDate} ${b.endTime}`)).slice(-14),
    [filteredEntries],
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="หน้าหลัก">
            <div className="brand-mark">⚡</div>
            <div className="brand-copy"><strong>ระบบติดตามการใช้ไฟฟ้า</strong><span>Electricity Monitoring Portal</span></div>
          </a>
          <nav className="desktop-nav"><a className="active" href="#dashboard">ภาพรวม</a><a href="#record">บันทึกมิเตอร์</a><a href="#analytics">สถิติ</a><a href="#history">ประวัติ</a></nav>
          <div className={`status-badge ${storageMode === 'cache' ? 'offline' : ''}`}><i /> {storageMode === 'remote' ? 'เชื่อม Google Sheet แล้ว' : storageMode === 'loading' ? 'กำลังเชื่อมต่อ...' : 'โหมดสำรองในเครื่อง'}</div>
        </div>
      </header>

      <main id="top" className="page-shell">
        <section id="dashboard" className="dashboard-heading">
          <div><span className="section-kicker">ELECTRICITY DASHBOARD</span><h1>ภาพรวมการใช้ไฟฟ้า</h1><p>วัดการใช้ไฟจากเลขมิเตอร์เริ่มต้นถึงเลขมิเตอร์สิ้นสุด พร้อมคำนวณระยะเวลาอัตโนมัติ</p></div>
          <div className="date-chip"><span>ข้อมูล ณ วันที่</span><strong>{formatDate(today)}</strong></div>
        </section>

        <section className="summary-grid">
          <article className="summary-card purple meter-range-card"><div className="summary-icon">◉</div><div className="summary-copy"><span>มิเตอร์เริ่มต้น - มิเตอร์ล่าสุด</span><strong className="meter-range-value">{earliestEntry && latestEntry ? `${formatMeterReading(earliestEntry.startUnit)} - ${formatMeterReading(latestEntry.endUnit)}` : '–'}</strong><small className="meter-range-date">{earliestEntry && latestEntry ? `${formatDate(earliestEntry.startDate)} → ${formatDate(latestEntry.endDate)}` : 'ยังไม่มีข้อมูล'}</small></div></article>
          <article className="summary-card blue"><div className="summary-icon">⚡</div><div className="summary-copy"><span>ใช้ไฟเดือนนี้</span><strong>{formatUnit(monthUnits)}</strong><small>หน่วย (kWh)</small></div></article>
          <article className="summary-card amber"><div className="summary-icon">◷</div><div className="summary-copy"><span>ช่วงเวลาที่วัดเดือนนี้</span><strong>{formatUnit(monthHours)}</strong><small>ชั่วโมง</small></div></article>
          <article className="summary-card cyan"><div className="summary-icon">฿</div><div className="summary-copy"><span>ค่าไฟเดือนนี้</span><strong>{formatMoney(monthCost)}</strong><small>บาท</small></div></article>
        </section>

        <section id="record" className="record-layout">
          <article className="panel form-panel">
            <div className="panel-heading"><div className="heading-group"><div className="heading-icon">✎</div><div><h2>{editingId ? 'แก้ไขช่วงการใช้ไฟ' : 'บันทึกต่อเนื่อง'}</h2><p>{editingId ? 'แก้ไขจุดเริ่มต้นและจุดสิ้นสุดของช่วงนี้' : 'ระบบใช้ค่าจบล่าสุดเป็นจุดเริ่มต้นรอบใหม่อัตโนมัติ'}</p></div></div><div className="heading-actions">{editingId ? <button className="button secondary" onClick={resetForm}>ยกเลิก</button> : latestEntry ? (continuationMode ? <button className="button secondary" type="button" onClick={startManualMode}>กำหนดจุดเริ่มเอง</button> : <button className="button secondary" type="button" onClick={() => applyContinuationStart()}>ใช้ค่าล่าสุดต่อ</button>) : null}</div></div>

            <form onSubmit={handleSubmit} className="entry-form interval-form">
              {!editingId && latestEntry && continuationMode && (
                <div className={`continuation-banner ${continuationReady ? '' : 'needs-time'}`}>
                  <div className="continuation-icon">↻</div>
                  <div>
                    <strong>ต่อจากค่าล่าสุดอัตโนมัติ</strong>
                    <span>{formatDate(latestEntry.endDate)} {latestEntry.endTime || 'ยังไม่มีเวลา'} · มิเตอร์ {formatMeterReading(latestEntry.endUnit)}</span>
                  </div>
                  <small>{continuationReady ? 'กรอกเฉพาะค่ามิเตอร์ล่าสุดด้านล่าง' : 'ข้อมูลเดิมไม่มีเวลา กรุณาระบุเวลาเริ่มก่อนบันทึกครั้งนี้'}</small>
                </div>
              )}
              {!editingId && !latestEntry && (
                <div className="continuation-banner first-reading">
                  <div className="continuation-icon">1</div>
                  <div><strong>บันทึกครั้งแรก</strong><span>กำหนดจุดเริ่มต้นและจุดสิ้นสุดครั้งแรก หลังจากนี้ระบบจะต่อให้อัตโนมัติ</span></div>
                </div>
              )}
              <div className={`reading-group start-reading ${continuationReady ? 'auto-start' : ''}`}>
                <div className="reading-group-title"><span className="reading-badge">A</span><div><strong>จุดเริ่มต้น {continuationHasLatest ? '· ต่อจากครั้งล่าสุด' : ''}</strong><small>{continuationHasLatest ? 'ระบบนำค่าจบล่าสุดมาใช้ให้อัตโนมัติ' : 'วันที่ เวลา และเลขมิเตอร์เริ่ม'}</small></div></div>
                <div className="reading-fields">
                  <label className="field"><span>วันที่เริ่ม</span><ThaiDatePicker value={startDate} onChange={setStartDate} disabled={continuationHasLatest} label="เลือกวันที่เริ่ม" /></label>
                  <label className="field"><span>เวลาเริ่ม</span><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={continuationReady} required /></label>
                  <label className="field meter-field"><span>หน่วยเริ่มต้น</span><div className="input-unit"><input type="number" step="0.01" value={startUnit} onChange={(e) => setStartUnit(e.target.value)} placeholder="77015" disabled={continuationHasLatest} required /><em>kWh</em></div></label>
                </div>
              </div>

              <div className="interval-arrow">→</div>

              <div className="reading-group end-reading">
                <div className="reading-group-title"><span className="reading-badge">B</span><div><strong>ค่ามิเตอร์ล่าสุด</strong><small>กรอกวันที่ เวลา และเลขมิเตอร์ที่อ่านได้ครั้งนี้</small></div></div>
                <div className="reading-fields">
                  <label className="field"><span>วันที่จบ</span><ThaiDatePicker value={endDate} onChange={setEndDate} label="เลือกวันที่จบ" /></label>
                  <label className="field"><span>เวลาจบ</span><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></label>
                  <label className="field meter-field"><span>หน่วยจบ</span><div className="input-unit"><input type="number" step="0.01" value={endUnit} onChange={(e) => setEndUnit(e.target.value)} placeholder="77047" required /><em>kWh</em></div></label>
                </div>
              </div>

              <label className="field full-field rate-field"><span>อัตราค่าไฟต่อหน่วย</span><div className="input-unit"><input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required /><em>บาท</em></div></label>
              {error && <div className="error-message">{error}</div>}
              <div className="form-actions"><button className="button primary submit-button" type="submit">✓ {editingId ? 'บันทึกการแก้ไข' : continuationHasLatest ? 'บันทึกค่าล่าสุดและนับต่อ' : 'บันทึกข้อมูลครั้งแรก'}</button></div>
            </form>
          </article>

          <aside className="calc-panel interval-summary">
            <div className="calc-top"><span className="calc-label">ผลการคำนวณช่วงนี้</span><div className="calc-icon">⚡</div></div>
            <div className="interval-metric"><span>ระยะเวลา</span><strong>{formatDuration(currentDurationHours)}</strong><small>{currentDurationHours > 0 ? `${formatUnit(currentDurationHours)} ชั่วโมง · ${formatUnit(currentDurationDays)} วัน` : 'ระบุวันและเวลาเริ่ม–จบ'}</small></div>
            <div className="calc-divider" />
            <div className="interval-metric"><span>ใช้ไฟไป</span><strong>{formatUnit(usedUnit)} <small>kWh</small></strong></div>
            <div className="calc-divider" />
            <div className="calc-cost"><span>ค่าไฟโดยประมาณ</span><strong>{formatMoney(estimatedCost)} <small>บาท</small></strong></div>
            <div className="formula-box"><span>การคำนวณ</span><p>หน่วยจบ − หน่วยเริ่ม = หน่วยที่ใช้<br />เวลาจบ − เวลาเริ่ม = ระยะเวลาที่วัด</p></div>
          </aside>
        </section>

        <section id="analytics" className="panel analytics-panel">
          <div className="panel-heading"><div className="heading-group"><div className="heading-icon chart-icon">⌁</div><div><h2>สถิติการใช้ไฟฟ้า</h2><p>แต่ละจุดบนกราฟแทนช่วงที่สิ้นสุดในวันนั้น ย้อนหลังสูงสุด 14 รายการ</p></div></div><div className="analytics-total"><span>ยอดสะสมทั้งหมด</span><strong>{formatUnit(totalUnits)} หน่วย · {formatMoney(totalCost)} บาท</strong></div></div>
          {chartEntries.length === 0 ? <div className="empty-state"><div className="empty-icon">⌁</div><strong>ยังไม่มีข้อมูลสถิติ</strong><span>เมื่อบันทึกช่วงการใช้ไฟแล้ว กราฟจะแสดงที่นี่</span></div> : (
            <>
              <div className="mobile-combined-chart"><CombinedLineChart entries={chartEntries} /></div>
              <div className="charts-grid desktop-chart-grid">
                <div className="chart-card"><div className="chart-title"><span className="legend-dot purple-dot" /> หน่วยที่ใช้ต่อช่วง (kWh)</div><LineChart entries={chartEntries} valueOf={(entry) => entry.endUnit - entry.startUnit} valueFormatter={formatUnit} /></div>
                <div className="chart-card cost-chart"><div className="chart-title"><span className="legend-dot amber-dot" /> ค่าใช้จ่ายต่อช่วง (บาท)</div><LineChart entries={chartEntries} valueOf={(entry) => (entry.endUnit - entry.startUnit) * entry.rate} valueFormatter={(value) => formatMoney(value, 0)} variant="amber" /></div>
              </div>
            </>
          )}
        </section>

        <section id="history" className="panel history-panel">
          <div className="panel-heading history-heading"><div className="heading-group"><div className="heading-icon">☷</div><div><h2>ประวัติช่วงการใช้ไฟ</h2><p>พบ {filteredEntries.length} รายการ</p></div></div><button className="button export-button" onClick={exportCsv} disabled={filteredEntries.length === 0}>⇩ ส่งออก CSV</button></div>
          <div className="filter-bar"><div className="filter-title">กรองตามวันที่สิ้นสุด</div><label className="filter-field"><span>จากวันที่</span><input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} /></label><label className="filter-field"><span>ถึงวันที่</span><input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} /></label><button className="button secondary clear-filter" onClick={() => { setFilterStart(''); setFilterEnd('') }}>ล้างตัวกรอง</button></div>
          <div className="table-wrap desktop-history-table"><table className="interval-table"><thead><tr><th>เริ่มต้น</th><th>หน่วยเริ่ม</th><th>สิ้นสุด</th><th>หน่วยจบ</th><th>ระยะเวลา</th><th>ใช้ไป</th><th>ค่าไฟ</th><th>จัดการ</th></tr></thead><tbody>
            {filteredEntries.length === 0 ? <tr><td colSpan={8} className="empty-cell">ยังไม่มีข้อมูลการบันทึก</td></tr> : filteredEntries.map((entry) => {
              const used = entry.endUnit - entry.startUnit
              const cost = used * entry.rate
              const duration = getDurationHours(entry)
              return <tr key={entry.id}>
                <td className="datetime-cell"><strong>{formatDate(entry.startDate)}</strong><span>{entry.startTime || '–'}</span></td>
                <td className="meter-reading">{formatMeterReading(entry.startUnit)}</td>
                <td className="datetime-cell"><strong>{formatDate(entry.endDate)}</strong><span>{entry.endTime || '–'}</span></td>
                <td className="meter-reading">{formatMeterReading(entry.endUnit)}</td>
                <td><span className="duration-pill">{formatDuration(duration)}</span><small className="hours-note">{duration > 0 ? `${formatUnit(duration)} ชม.` : ''}</small></td>
                <td><span className="unit-pill">{formatUnit(used)} kWh</span></td>
                <td className="money">{formatMoney(cost)} บาท</td>
                <td><div className="row-actions"><button className="icon-button" onClick={() => handleEdit(entry)}>✎ แก้ไข</button><button className="icon-button danger" onClick={() => handleDelete(entry.id)}>⌫ ลบ</button></div></td>
              </tr>
            })}
          </tbody></table></div>
          <div className="mobile-history-list">
            {filteredEntries.length === 0 ? <div className="mobile-history-empty">ยังไม่มีข้อมูลการบันทึก</div> : filteredEntries.map((entry) => {
              const used = entry.endUnit - entry.startUnit
              const cost = used * entry.rate
              const duration = getDurationHours(entry)
              return (
                <article className="mobile-history-row" key={`mobile-${entry.id}`}>
                  <div className="mobile-history-main">
                    <strong>{formatDate(entry.startDate)} {entry.startTime || '–'} → {formatDate(entry.endDate)} {entry.endTime || '–'}</strong>
                    <span>{formatMeterReading(entry.startUnit)} → {formatMeterReading(entry.endUnit)}</span>
                  </div>
                  <div className="mobile-history-stats">
                    <span className="mobile-stat unit">{formatUnit(used)} kWh</span>
                    <span className="mobile-stat time">{formatDuration(duration)}</span>
                    <span className="mobile-stat cost">{formatMoney(cost)} บ.</span>
                  </div>
                  <div className="mobile-history-actions">
                    <button className="icon-button" onClick={() => handleEdit(entry)}>✎</button>
                    <button className="icon-button danger" onClick={() => handleDelete(entry.id)}>⌫</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="site-footer"><div className="footer-inner"><div><strong>⚡ ระบบติดตามการใช้ไฟฟ้า</strong><span>ติดตามหน่วยไฟและระยะเวลาการใช้งานจากเลขมิเตอร์จริง</span></div><span>ข้อมูลบันทึกลง Google Sheet และมีสำเนาสำรองในเครื่อง</span></div></footer>
      <nav className="mobile-nav"><a href="#dashboard"><span>⌂</span>ภาพรวม</a><a href="#record"><span>✎</span>บันทึก</a><a href="#analytics"><span>⌁</span>สถิติ</a><a href="#history"><span>☷</span>ประวัติ</a></nav>
    </div>
  )
}

export default App
