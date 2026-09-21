import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { electricityRepository } from './data/electricityRepository'
import type { ElectricityEntry } from './data/electricityRepository'
import './App.css'

function getLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getLocalTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function formatNumber(value: number, digits = 2) {
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

function formatDate(date: string) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    day: '2-digit',
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

function monthKey(date: string) {
  return date.slice(0, 7)
}

type LineChartProps = {
  entries: ElectricityEntry[]
  valueOf: (entry: ElectricityEntry) => number
  valueFormatter: (value: number) => string
  variant?: 'purple' | 'amber'
}

function LineChart({ entries, valueOf, valueFormatter, variant = 'purple' }: LineChartProps) {
  const width = Math.max(640, entries.length * 76)
  const height = 250
  const left = 34
  const right = 24
  const top = 30
  const bottom = 46
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const values = entries.map(valueOf)
  const maxValue = Math.max(1, ...values)

  const points = entries.map((entry, index) => {
    const x = entries.length === 1
      ? left + chartWidth / 2
      : left + (index / (entries.length - 1)) * chartWidth
    const y = top + chartHeight - (valueOf(entry) / maxValue) * chartHeight
    return { entry, x, y, value: valueOf(entry) }
  })

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className="line-chart-scroll">
      <svg
        className={`line-chart-svg ${variant === 'amber' ? 'amber-line' : ''}`}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="กราฟเส้นรายวัน"
      >
        {[0, 1, 2, 3].map((grid) => {
          const y = top + (grid / 3) * chartHeight
          return <line key={grid} className="chart-grid-line" x1={left} y1={y} x2={width - right} y2={y} />
        })}
        {points.length > 1 && <polyline className="line-series" points={polyline} />}
        {points.map((point) => (
          <g key={point.entry.id}>
            <circle className="line-point-halo" cx={point.x} cy={point.y} r="8" />
            <circle className="line-point" cx={point.x} cy={point.y} r="4.5" />
            <text className="line-value" x={point.x} y={Math.max(16, point.y - 13)} textAnchor="middle">
              {valueFormatter(point.value)}
            </text>
            <text className="line-date" x={point.x} y={height - 14} textAnchor="middle">
              {formatChartDate(point.entry.date)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function App() {
  const today = getLocalDate()
  const [entries, setEntries] = useState<ElectricityEntry[]>(electricityRepository.getCachedEntries)
  const [date, setDate] = useState(today)
  const [recordTime, setRecordTime] = useState(getLocalTime)
  const [startUnit, setStartUnit] = useState('')
  const [endUnit, setEndUnit] = useState('')
  const [rate, setRate] = useState('4.80')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [error, setError] = useState('')
  const [storageMode, setStorageMode] = useState<'loading' | 'remote' | 'cache'>('loading')

  const usedUnit = Math.max(0, Number(endUnit || 0) - Number(startUnit || 0))
  const estimatedCost = usedUnit * Number(rate || 0)

  useEffect(() => {
    let mounted = true
    electricityRepository.list().then((result) => {
      if (!mounted) return
      setEntries(result.entries)
      setStorageMode(result.source)
    })
    return () => { mounted = false }
  }, [])

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => `${b.date} ${b.recordTime || ''}`.localeCompare(`${a.date} ${a.recordTime || ''}`)),
    [entries],
  )

  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      if (filterStart && entry.date < filterStart) return false
      if (filterEnd && entry.date > filterEnd) return false
      return true
    })
  }, [sortedEntries, filterStart, filterEnd])

  const todayEntry = entries.find((entry) => entry.date === today)
  const thisMonthEntries = entries.filter((entry) => monthKey(entry.date) === monthKey(today))

  const sumUnits = (items: ElectricityEntry[]) =>
    items.reduce((sum, entry) => sum + (entry.endUnit - entry.startUnit), 0)

  const sumCost = (items: ElectricityEntry[]) =>
    items.reduce((sum, entry) => sum + (entry.endUnit - entry.startUnit) * entry.rate, 0)

  const monthUnits = sumUnits(thisMonthEntries)
  const monthCost = sumCost(thisMonthEntries)
  const totalUnits = sumUnits(entries)
  const totalCost = sumCost(entries)
  const averageDailyUnits = thisMonthEntries.length ? monthUnits / thisMonthEntries.length : 0

  const resetForm = () => {
    setDate(today)
    setRecordTime(getLocalTime())
    setStartUnit('')
    setEndUnit('')
    setRate('4.80')
    setEditingId(null)
    setError('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const start = Number(startUnit)
    const end = Number(endUnit)
    const unitRate = Number(rate)

    if (!date || !recordTime || startUnit === '' || endUnit === '' || rate === '') {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
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

    const item: ElectricityEntry = {
      id: editingId ?? crypto.randomUUID(),
      date,
      recordTime,
      startUnit: start,
      endUnit: end,
      rate: unitRate,
    }

    let next: ElectricityEntry[]
    if (editingId) {
      next = entries.map((entry) => (entry.id === editingId ? item : entry))
    } else {
      const sameDate = entries.find((entry) => entry.date === date)
      if (sameDate) {
        setError('วันที่นี้มีข้อมูลแล้ว กรุณาแก้ไขรายการเดิมแทน')
        return
      }
      next = [...entries, item]
    }

    setEntries(next)
    try {
      const source = await electricityRepository.upsert(item)
      setStorageMode(source)
      resetForm()
    } catch {
      setStorageMode('cache')
      setError('บันทึกสำรองในเครื่องแล้ว แต่ยังส่งขึ้น Google Sheet ไม่สำเร็จ')
    }
  }

  const handleEdit = (entry: ElectricityEntry) => {
    setEditingId(entry.id)
    setDate(entry.date)
    setRecordTime(entry.recordTime || getLocalTime())
    setStartUnit(String(entry.startUnit))
    setEndUnit(String(entry.endUnit))
    setRate(String(entry.rate))
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return
    setEntries(entries.filter((entry) => entry.id !== id))
    try {
      const source = await electricityRepository.remove(id)
      setStorageMode(source)
    } catch {
      setStorageMode('cache')
      window.alert('ลบข้อมูลในเครื่องแล้ว แต่ยังซิงก์การลบไป Google Sheet ไม่สำเร็จ')
    }
    if (editingId === id) resetForm()
  }

  const exportCsv = () => {
    const rows = [
      ['วันที่', 'เวลาบันทึก', 'หน่วยเริ่ม', 'หน่วยจบ', 'หน่วยที่ใช้', 'ราคาต่อหน่วย', 'ค่าไฟรวม'],
      ...filteredEntries.map((entry) => {
        const used = entry.endUnit - entry.startUnit
        return [entry.date, entry.recordTime || '', entry.startUnit, entry.endUnit, used, entry.rate, used * entry.rate]
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
    () => [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    [filteredEntries],
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="หน้าหลัก">
            <div className="brand-mark" aria-hidden="true">⚡</div>
            <div className="brand-copy">
              <strong>ระบบติดตามการใช้ไฟฟ้า</strong>
              <span>Electricity Monitoring Portal</span>
            </div>
          </a>
          <nav className="desktop-nav" aria-label="เมนูหลัก">
            <a className="active" href="#dashboard">ภาพรวม</a>
            <a href="#record">บันทึกมิเตอร์</a>
            <a href="#analytics">สถิติ</a>
            <a href="#history">ประวัติ</a>
          </nav>
          <div className={`status-badge ${storageMode === 'cache' ? 'offline' : ''}`}><i /> {storageMode === 'remote' ? 'เชื่อม Google Sheet แล้ว' : storageMode === 'loading' ? 'กำลังเชื่อมต่อ...' : 'โหมดสำรองในเครื่อง'}</div>
        </div>
      </header>

      <main id="top" className="page-shell">
        <section id="dashboard" className="dashboard-heading">
          <div>
            <span className="section-kicker">ELECTRICITY DASHBOARD</span>
            <h1>ภาพรวมการใช้ไฟฟ้า</h1>
            <p>บันทึกเลขมิเตอร์ ติดตามหน่วยที่ใช้ และตรวจสอบค่าใช้จ่ายได้ในหน้าเดียว</p>
          </div>
          <div className="date-chip">
            <span>ข้อมูล ณ วันที่</span>
            <strong>{formatDate(today)}</strong>
          </div>
        </section>

        <section className="summary-grid" aria-label="สรุปข้อมูลการใช้ไฟ">
          <article className="summary-card purple">
            <div className="summary-icon">⌁</div>
            <div className="summary-copy">
              <span>ใช้ไฟวันนี้</span>
              <strong>{todayEntry ? formatUnit(todayEntry.endUnit - todayEntry.startUnit) : '0'}</strong>
              <small>หน่วย (kWh)</small>
            </div>
          </article>
          <article className="summary-card blue">
            <div className="summary-icon">▦</div>
            <div className="summary-copy">
              <span>ใช้ไฟเดือนนี้</span>
              <strong>{formatUnit(monthUnits)}</strong>
              <small>หน่วย (kWh)</small>
            </div>
          </article>
          <article className="summary-card amber">
            <div className="summary-icon">฿</div>
            <div className="summary-copy">
              <span>ค่าไฟเดือนนี้</span>
              <strong>{formatNumber(monthCost)}</strong>
              <small>บาท</small>
            </div>
          </article>
          <article className="summary-card cyan">
            <div className="summary-icon">↗</div>
            <div className="summary-copy">
              <span>เฉลี่ยต่อวัน</span>
              <strong>{formatUnit(averageDailyUnits)}</strong>
              <small>หน่วย (kWh)</small>
            </div>
          </article>
        </section>

        <section id="record" className="record-layout">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div className="heading-group">
                <div className="heading-icon">✎</div>
                <div>
                  <h2>{editingId ? 'แก้ไขข้อมูลมิเตอร์' : 'บันทึกเลขมิเตอร์'}</h2>
                  <p>ระบุวันที่และเวลาที่อ่านมิเตอร์ ระบบจะคำนวณหน่วยและค่าไฟอัตโนมัติ</p>
                </div>
              </div>
              {editingId && <button className="button secondary" onClick={resetForm}>ยกเลิก</button>}
            </div>

            <form onSubmit={handleSubmit} className="entry-form">
              <label className="field">
                <span>วันที่บันทึก</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label className="field">
                <span>เวลาบันทึก</span>
                <input type="time" value={recordTime} onChange={(e) => setRecordTime(e.target.value)} required />
              </label>
              <label className="field">
                <span>หน่วยเริ่มต้น</span>
                <div className="input-unit">
                  <input type="number" step="0.01" value={startUnit} onChange={(e) => setStartUnit(e.target.value)} placeholder="เช่น 77015" required />
                  <em>kWh</em>
                </div>
              </label>
              <label className="field">
                <span>หน่วยสิ้นสุด</span>
                <div className="input-unit">
                  <input type="number" step="0.01" value={endUnit} onChange={(e) => setEndUnit(e.target.value)} placeholder="เช่น 77047" required />
                  <em>kWh</em>
                </div>
              </label>
              <label className="field full-field">
                <span>อัตราค่าไฟต่อหน่วย</span>
                <div className="input-unit">
                  <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required />
                  <em>บาท</em>
                </div>
              </label>

              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button className="button primary submit-button" type="submit">
                  <span>✓</span> {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </article>

          <aside className="calc-panel">
            <div className="calc-top">
              <span className="calc-label">ผลการคำนวณ</span>
              <div className="calc-icon">⚡</div>
            </div>
            <div className="calc-main">
              <span>หน่วยที่ใช้</span>
              <strong>{formatUnit(usedUnit)}</strong>
              <small>กิโลวัตต์-ชั่วโมง (kWh)</small>
            </div>
            <div className="calc-divider" />
            <div className="calc-cost">
              <span>ค่าไฟโดยประมาณ</span>
              <strong>{formatNumber(estimatedCost)} <small>บาท</small></strong>
            </div>
            <div className="formula-box">
              <span>สูตรคำนวณ</span>
              <p>(หน่วยจบ − หน่วยเริ่ม) × ราคาต่อหน่วย</p>
            </div>
          </aside>
        </section>

        <section id="analytics" className="panel analytics-panel">
          <div className="panel-heading">
            <div className="heading-group">
              <div className="heading-icon chart-icon">⌁</div>
              <div>
                <h2>สถิติการใช้ไฟฟ้า</h2>
                <p>กราฟเส้นแสดงแนวโน้มรายวัน โดยแต่ละจุดแทนข้อมูล 1 วันย้อนหลังสูงสุด 14 วัน</p>
              </div>
            </div>
            <div className="analytics-total">
              <span>ยอดสะสมทั้งหมด</span>
              <strong>{formatUnit(totalUnits)} หน่วย · {formatNumber(totalCost)} บาท</strong>
            </div>
          </div>

          {chartEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⌁</div>
              <strong>ยังไม่มีข้อมูลสถิติ</strong>
              <span>เมื่อบันทึกเลขมิเตอร์แล้ว กราฟจะแสดงที่นี่</span>
            </div>
          ) : (
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-title"><span className="legend-dot purple-dot" /> หน่วยที่ใช้ต่อวัน (kWh)</div>
                <LineChart
                  entries={chartEntries}
                  valueOf={(entry) => entry.endUnit - entry.startUnit}
                  valueFormatter={formatUnit}
                />
              </div>

              <div className="chart-card cost-chart">
                <div className="chart-title"><span className="legend-dot amber-dot" /> ค่าใช้จ่ายต่อวัน (บาท)</div>
                <LineChart
                  entries={chartEntries}
                  valueOf={(entry) => (entry.endUnit - entry.startUnit) * entry.rate}
                  valueFormatter={(value) => formatNumber(value, 0)}
                  variant="amber"
                />
              </div>
            </div>
          )}
        </section>

        <section id="history" className="panel history-panel">
          <div className="panel-heading history-heading">
            <div className="heading-group">
              <div className="heading-icon">☷</div>
              <div>
                <h2>ประวัติการบันทึก</h2>
                <p>พบ {filteredEntries.length} รายการ</p>
              </div>
            </div>
            <button className="button export-button" onClick={exportCsv} disabled={filteredEntries.length === 0}>⇩ ส่งออก CSV</button>
          </div>

          <div className="filter-bar">
            <div className="filter-title">ตัวกรองช่วงวันที่</div>
            <label className="filter-field"><span>จากวันที่</span><input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} /></label>
            <label className="filter-field"><span>ถึงวันที่</span><input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} /></label>
            <button className="button secondary clear-filter" onClick={() => { setFilterStart(''); setFilterEnd('') }}>ล้างตัวกรอง</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>หน่วยเริ่ม</th>
                  <th>หน่วยจบ</th>
                  <th>ใช้ไป</th>
                  <th>อัตรา/หน่วย</th>
                  <th>ค่าไฟรวม</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr><td colSpan={8} className="empty-cell">ยังไม่มีข้อมูลการบันทึก</td></tr>
                ) : filteredEntries.map((entry) => {
                  const used = entry.endUnit - entry.startUnit
                  const cost = used * entry.rate
                  return (
                    <tr key={entry.id}>
                      <td className="date-cell"><strong>{formatDate(entry.date)}</strong></td>
                      <td><span className="time-pill">{entry.recordTime || '–'}</span></td>
                      <td>{formatUnit(entry.startUnit)}</td>
                      <td>{formatUnit(entry.endUnit)}</td>
                      <td><span className="unit-pill">{formatUnit(used)} kWh</span></td>
                      <td>{formatNumber(entry.rate)} บาท</td>
                      <td className="money">{formatNumber(cost)} บาท</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-button" onClick={() => handleEdit(entry)}>✎ แก้ไข</button>
                          <button className="icon-button danger" onClick={() => handleDelete(entry.id)}>⌫ ลบ</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div><strong>⚡ ระบบติดตามการใช้ไฟฟ้า</strong><span>เครื่องมือสำหรับติดตามและวิเคราะห์การใช้พลังงาน</span></div>
          <span>ข้อมูลบันทึกลง Google Sheet และมีสำเนาสำรองในเครื่อง</span>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="เมนูมือถือ">
        <a href="#dashboard"><span>⌂</span>ภาพรวม</a>
        <a href="#record"><span>✎</span>บันทึก</a>
        <a href="#analytics"><span>⌁</span>สถิติ</a>
        <a href="#history"><span>☷</span>ประวัติ</a>
      </nav>
    </div>
  )
}

export default App
