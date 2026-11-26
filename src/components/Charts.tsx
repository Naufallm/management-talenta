import { useEffect, useId, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { TalentPoint, ScoreConfig } from '../../shared/contracts';
import { months, quadrantLabels } from '../../shared/constants';
import { number, Empty } from './ui';
import { ckpLineColors, type CkpEmployeeTrend } from '../../shared/ckp';
import { useChartMotion } from '../lib/motion';
export function TalentChart({
  points,
  config,
  self = false,
}: {
  points: TalentPoint[];
  config: ScoreConfig;
  self?: boolean;
}) {
  const navigate = useNavigate(),
    x = config.potential_threshold,
    y = config.competency_threshold;
  if (!points.length)
    return (
      <Empty
        title="Peta talenta belum tersedia"
        description="Lengkapi asesmen potensi dan penilaian kompetensi untuk menampilkan posisi."
      />
    );
  return (
    <div
      className="talent-chart"
      role="group"
      aria-label="Peta talenta. Sumbu X potensi, sumbu Y kompetensi. Rincian titik tersedia pada tabel data."
    >
      <div className="talent-chart-legend" aria-label="Kategori kuadran">
        <span className="legend-excellent">Kuadran IV - Talenta Unggul</span>
        <span className="legend-professional">Kuadran II - Profesional Andal</span>
        <span className="legend-growing">Kuadran III - Talenta Berkembang</span>
        <span className="legend-development">Kuadran I - Perlu Pengembangan</span>
      </div>
      <div className="axis-caption">KOMPETENSI ↑</div>
      <div
        className="talent-chart-canvas"
        role="img"
        aria-label="Grafik posisi pegawai berdasarkan potensi dan kompetensi"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 28, right: 28, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#eceff7" strokeDasharray="3 4" />
            <XAxis
              type="number"
              dataKey="potential"
              name="Potensi"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8d9abb' }}
            />
            <YAxis
              type="number"
              dataKey="competency"
              name="Kompetensi"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              width={32}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8d9abb' }}
            />
            <ReferenceArea x1={0} x2={x} y1={y} y2={100} fill="#eaf2f8" fillOpacity={0.8} />
            <ReferenceArea x1={x} x2={100} y1={y} y2={100} fill="#eaf6ec" fillOpacity={0.8} />
            <ReferenceArea x1={0} x2={x} y1={0} y2={y} fill="#f1f4f5" fillOpacity={0.8} />
            <ReferenceArea x1={x} x2={100} y1={0} y2={y} fill="#fff0df" fillOpacity={0.75} />
            <ReferenceLine x={x} stroke="#aabcc9" strokeDasharray="4 4" />
            <ReferenceLine y={y} stroke="#aabcc9" strokeDasharray="4 4" />
            <Tooltip
              allowEscapeViewBox={{ x: false, y: true }}
              wrapperStyle={{ pointerEvents: 'none', zIndex: 5 }}
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as TalentPoint | undefined;
                return active && d ? (
                  <div className="chart-tooltip">
                    <strong>{d.name}</strong>
                    <span>{quadrantLabels[d.quadrant] || d.quadrant}</span>
                    <small>
                      Potensi {number(d.potential)} · Kompetensi {number(d.competency)}
                    </small>
                  </div>
                ) : null;
              }}
            />
            <Scatter
              data={points}
              fill="#174c79"
              isAnimationActive={false}
              cursor="pointer"
              onClick={(d: any) =>
                navigate(self ? '/profil' : `/pegawai/${d.employee_id || d.payload?.employee_id}`)
              }
              shape={(props: any) => (
                <g>
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={10}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  <image
                    data-employee-id={props.payload?.employee_id}
                    aria-label={props.payload?.name}
                    href="/assets/talent-point.svg"
                    x={props.cx - 4.5}
                    y={props.cy - 4.5}
                    width={9}
                    height={9}
                  />
                </g>
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="axis-caption bottom">POTENSI →</div>
    </div>
  );
}
export function CkpChart({
  trend,
  variant = 'line',
  accent,
}: {
  trend: { month: number; score: number | null }[];
  variant?: 'line' | 'area' | 'bar';
  accent?: string;
}) {
  const fillId = `ckp-fill-${useId()}`;
  const motion = useChartMotion();
  const color = accent || '#2c3cdd';
  const Chart = variant === 'area' ? AreaChart : variant === 'bar' ? BarChart : LineChart;
  if (trend.every((r) => r.score === null))
    return (
      <Empty
        title="Belum ada Capaian Kinerja Pegawai"
        description="Nilai bulanan akan tampil setelah diinput."
      />
    );
  return (
    <div
      className="ckp-chart"
      ref={motion.ref}
      data-motion={motion.reducedMotion ? 'reduced' : 'animated'}
      role="img"
      aria-label={
        variant === 'bar'
          ? 'Grafik batang Capaian Kinerja Pegawai selama 12 bulan. Bulan tanpa nilai tidak memiliki batang.'
          : 'Tren Capaian Kinerja Pegawai selama 12 bulan. Nilai yang belum tercatat ditampilkan sebagai jeda.'
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <Chart
          data={trend.map((r) => ({ ...r, label: months[r.month - 1] }))}
          margin={{ left: 0, right: 20, top: 20, bottom: 0 }}
        >
          {variant === 'area' && (
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.23} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
          )}
          <CartesianGrid vertical={false} stroke="#eceff7" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#8d9abb' }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            width={35}
            tick={{ fontSize: 11, fill: '#8d9abb' }}
          />
          <Tooltip
            formatter={(v) => [number(Number(v)), 'Nilai kinerja']}
            contentStyle={{ border: '1px solid #e1e9ef', borderRadius: 8, fontSize: 12 }}
          />
          {variant === 'bar' ? (
            <Bar
              dataKey="score"
              name="Nilai kinerja"
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              {...motion.animationProps}
            />
          ) : variant === 'area' ? (
            <Area
              type="linear"
              dataKey="score"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${fillId})`}
              dot={{ r: 3, strokeWidth: 2, fill: 'white' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              {...motion.animationProps}
            />
          ) : (
            <Line
              type="linear"
              dataKey="score"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, fill: 'white' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              {...motion.animationProps}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

export interface EmployeeCkpPoint {
  employee_id: string;
  name: string;
  nip: string;
  score: number | null;
}

export function CkpComparisonChart({
  employees,
  selected,
  average,
}: {
  employees: CkpEmployeeTrend[];
  selected: string[];
  average: { month: number; score: number | null }[];
}) {
  const motion = useChartMotion();
  const [highlight, setHighlight] = useState<string | null>(null);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const series = useMemo(
    () => employees.filter((employee) => selected.includes(employee.employee_id)),
    [employees, selected],
  );
  const plotted = useMemo(
    () =>
      series.length
        ? series.map((employee) => ({
            ...employee,
            color: ckpLineColors[employees.indexOf(employee) % ckpLineColors.length],
          }))
        : [
            {
              employee_id: 'average',
              name: 'Rata-rata seluruh pegawai',
              nip: '',
              trend: average,
              color: '#2c3cdd',
            },
          ],
    [series, employees, average],
  );
  const data = useMemo(
    () =>
      average.map((point, index) => ({
        label: months[point.month - 1],
        average: point.score,
        values: Object.fromEntries(
          plotted.map((employee) => [employee.employee_id, employee.trend[index].score]),
        ),
      })),
    [average, plotted],
  );
  const dense = plotted.length > 5;
  const highlighted = plotted.some((employee) => employee.employee_id === highlight)
    ? highlight
    : null;
  if (plotted.every((employee) => employee.trend.every((point) => point.score === null)))
    return (
      <Empty
        title="Belum ada Capaian Kinerja Pegawai"
        description="Pegawai yang dipilih belum memiliki nilai pada tahun ini."
      />
    );
  return (
    <div
      className="ckp-comparison-chart"
      ref={motion.ref}
      data-motion={motion.reducedMotion ? 'reduced' : 'animated'}
      onMouseLeave={() => {
        setTooltipIndex(null);
      }}
    >
      {dense && (
        <p className="ckp-chart-guide">
          {plotted.length} pegawai dibandingkan. Garis tebal menunjukkan rata-rata pilihan. Pilih
          nama di legenda untuk menyorot satu garis.
        </p>
      )}
      <div
        role="img"
        aria-label={`Perbandingan garis kinerja 12 bulan: ${plotted.map((employee) => employee.name).join(', ')}. Nilai kosong ditampilkan sebagai jeda.`}
        tabIndex={0}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
            onMouseMove={(state) => {
              if (state.activeTooltipIndex != null) {
                const index = Number(state.activeTooltipIndex);
                if (Number.isInteger(index) && index >= 0 && index < 12) setTooltipIndex(index);
              }
            }}
          >
            <CartesianGrid vertical={false} stroke="#eceff7" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8d9abb' }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              width={35}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8d9abb' }}
            />
            <Tooltip active={tooltipIndex !== null} content={() => null} />
            {plotted.map((employee) => (
              <Line
                key={employee.employee_id}
                name={employee.name}
                dataKey={(point) => point.values[employee.employee_id]}
                stroke={employee.color}
                strokeWidth={highlighted === employee.employee_id ? 3 : dense ? 1.4 : 2}
                strokeOpacity={
                  highlighted ? (highlighted === employee.employee_id ? 1 : 0.12) : dense ? 0.55 : 1
                }
                type="linear"
                dot={dense ? false : { r: 3, strokeWidth: 1.5, fill: 'white' }}
                activeDot={{ r: highlighted && highlighted !== employee.employee_id ? 0 : 4 }}
                connectNulls={false}
                {...motion.animationProps}
              />
            ))}
            {dense && (
              <Line
                name="Rata-rata pilihan"
                dataKey="average"
                stroke="#28335a"
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={false}
                activeDot={false}
                connectNulls={false}
                {...motion.animationProps}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {tooltipIndex !== null && (
        <section className="ckp-scroll-tooltip" aria-label="Rincian nilai per bulan">
          <header>
            <strong>{months[tooltipIndex]}</strong>
            <button
              type="button"
              onClick={() => {
                setTooltipIndex(null);
              }}
            >
              Tutup
            </button>
          </header>
          <p>Gulir untuk melihat seluruh pegawai.</p>
          <ul tabIndex={0} aria-label="Nilai seluruh pegawai pada bulan terpilih">
            {[...plotted]
              .sort(
                (a, b) => (b.trend[tooltipIndex].score ?? -1) - (a.trend[tooltipIndex].score ?? -1),
              )
              .map((employee) => (
                <li key={employee.employee_id}>
                  <span className="ckp-color-dot" style={{ backgroundColor: employee.color }} />
                  <span>{employee.name}</span>
                  <strong>{number(employee.trend[tooltipIndex].score)}</strong>
                </li>
              ))}
          </ul>
        </section>
      )}
      {series.length > 0 && (
        <ul className="ckp-line-legend" aria-label="Legenda pegawai pembanding">
          {series.map((employee) => (
            <li key={employee.employee_id}>
              <span
                className="ckp-color-dot"
                style={{
                  backgroundColor:
                    ckpLineColors[employees.indexOf(employee) % ckpLineColors.length],
                }}
              />
              <button
                type="button"
                aria-pressed={highlighted === employee.employee_id}
                onClick={() =>
                  setHighlight(highlighted === employee.employee_id ? null : employee.employee_id)
                }
              >
                {employee.name}
                {employee.trend.every((point) => point.score === null) && ' · Belum ada nilai'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EmployeeCkpChart({ rows }: { rows: EmployeeCkpPoint[] }) {
  const motion = useChartMotion();
  const hasScores = rows.some((row) => row.score !== null);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 1100px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1100px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return (
    <div
      className="employee-ckp-chart"
      ref={motion.ref}
      data-motion={motion.reducedMotion ? 'reduced' : 'animated'}
    >
      {hasScores ? (
        <>
          <p className="muted">Nilai kinerja (0–100)</p>
          <div className="employee-ckp-canvas">
            <div
              style={{
                width: '100%',
                height: compact ? Math.max(280, rows.length * 46 + 40) : 430,
              }}
              role="img"
              aria-label={`Grafik batang capaian kinerja seluruh pegawai tanpa geser ke samping. ${compact ? 'Nama pegawai di kiri, nilai 0 sampai 100 pada sumbu X.' : 'Sumbu X nama pegawai, sumbu Y nilai 0 sampai 100.'} Rincian tersedia di bawah grafik.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout={compact ? 'vertical' : 'horizontal'}
                  margin={{ top: 16, right: compact ? 34 : 12, left: 0, bottom: 12 }}
                >
                  <CartesianGrid
                    vertical={compact}
                    horizontal={!compact}
                    stroke="#eceff7"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    type={compact ? 'number' : 'category'}
                    dataKey={compact ? undefined : 'name'}
                    domain={compact ? [0, 100] : undefined}
                    ticks={compact ? [0, 25, 50, 75, 100] : undefined}
                    interval={0}
                    height={compact ? 30 : 145}
                    angle={compact ? 0 : -55}
                    textAnchor={compact ? 'middle' : 'end'}
                    tickMargin={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#8d9abb' }}
                  />
                  <YAxis
                    type={compact ? 'category' : 'number'}
                    dataKey={compact ? 'name' : undefined}
                    domain={compact ? undefined : [0, 100]}
                    ticks={compact ? undefined : [0, 25, 50, 75, 100]}
                    interval={0}
                    width={compact ? 115 : 40}
                    tickLine={false}
                    axisLine={false}
                    tick={
                      compact
                        ? ({ x, y, payload }) => {
                            const words = String(payload.value).split(' ');
                            return (
                              <text
                                x={x}
                                y={Number(y) - (words.length - 1) * 6}
                                textAnchor="end"
                                fill="#496174"
                                fontSize={10}
                              >
                                {words.map((word, index) => (
                                  <tspan x={x} dy={index ? 12 : 0} key={index}>
                                    {word}
                                  </tspan>
                                ))}
                              </text>
                            );
                          }
                        : { fontSize: 11, fill: '#8d9abb' }
                    }
                  />
                  <Tooltip
                    position={compact ? { x: 0, y: 0 } : undefined}
                    wrapperStyle={{ maxWidth: '100%' }}
                    formatter={(value) => [number(Number(value)), 'Nilai kinerja']}
                    contentStyle={{ border: '1px solid #e1e9ef', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar
                    dataKey="score"
                    fill="#a5b1f5"
                    activeBar={{ fill: '#2c3cdd' }}
                    radius={compact ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                    maxBarSize={compact ? 20 : 36}
                    label={
                      compact
                        ? {
                            position: 'right',
                            fontSize: 10,
                            fill: '#496174',
                            formatter: (value: unknown) => number(Number(value)),
                          }
                        : false
                    }
                    {...motion.animationProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="muted employee-ckp-caption">
            {compact
              ? 'Seluruh nama pegawai ditampilkan di kiri.'
              : 'Seluruh nama pegawai ditampilkan pada sumbu X.'}{' '}
            Pegawai tanpa nilai tidak memiliki batang.
          </p>
        </>
      ) : (
        <Empty
          title="Belum ada Capaian Kinerja Pegawai"
          description="Belum ada nilai pada bulan dan periode yang dipilih."
        />
      )}
      <details className="employee-ckp-data">
        <summary>Lihat nilai seluruh pegawai</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pegawai</th>
                <th>NIP</th>
                <th>Nilai kinerja</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employee_id}>
                  <td>{row.name}</td>
                  <td className="mono">{row.nip}</td>
                  <td>{row.score === null ? 'Belum ada nilai' : number(row.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
