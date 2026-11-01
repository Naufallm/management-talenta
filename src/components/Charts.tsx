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
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { TalentPoint, ScoreConfig } from '../../shared/contracts';
import { months } from '../../shared/constants';
import { number, Empty } from './ui';
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
      role="img"
      aria-label="Peta talenta. Sumbu X potensi, sumbu Y kompetensi. Rincian titik tersedia pada tabel data."
    >
      <div className="axis-caption">KOMPETENSI ↑</div>
      <div className="talent-chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#e1e9ef" strokeDasharray="3 4" />
            <XAxis
              type="number"
              dataKey="potential"
              name="Potensi"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#718293' }}
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
              tick={{ fontSize: 11, fill: '#718293' }}
            />
            <ReferenceArea
              x1={0}
              x2={x}
              y1={y}
              y2={100}
              fill="#eaf2f8"
              fillOpacity={0.8}
              label={{
                value: 'Profesional Andal',
                position: 'insideTopLeft',
                fill: '#58738c',
                fontSize: 10,
              }}
            />
            <ReferenceArea
              x1={x}
              x2={100}
              y1={y}
              y2={100}
              fill="#eaf6ec"
              fillOpacity={0.8}
              label={{
                value: 'Talenta Unggul',
                position: 'insideTopRight',
                fill: '#437d3b',
                fontSize: 10,
              }}
            />
            <ReferenceArea
              x1={0}
              x2={x}
              y1={0}
              y2={y}
              fill="#f1f4f5"
              fillOpacity={0.8}
              label={{
                value: 'Perlu Pengembangan',
                position: 'insideBottomLeft',
                fill: '#718293',
                fontSize: 10,
              }}
            />
            <ReferenceArea
              x1={x}
              x2={100}
              y1={0}
              y2={y}
              fill="#fff0df"
              fillOpacity={0.75}
              label={{
                value: 'Talenta Berkembang',
                position: 'insideBottomRight',
                fill: '#a16a2b',
                fontSize: 10,
              }}
            />
            <ReferenceLine x={x} stroke="#aabcc9" strokeDasharray="4 4" />
            <ReferenceLine y={y} stroke="#aabcc9" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as TalentPoint | undefined;
                return active && d ? (
                  <div className="chart-tooltip">
                    <strong>{d.name}</strong>
                    <span>{d.quadrant}</span>
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
                <image
                  href="/assets/talent-point.svg"
                  x={props.cx - 4.5}
                  y={props.cy - 4.5}
                  width={9}
                  height={9}
                />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="axis-caption bottom">POTENSI →</div>
    </div>
  );
}
export function CkpChart({ trend }: { trend: { month: number; score: number | null }[] }) {
  if (trend.every((r) => r.score === null))
    return <Empty title="Belum ada CKP" description="Nilai bulanan akan tampil setelah diinput." />;
  return (
    <div
      className="ckp-chart"
      role="img"
      aria-label="Tren CKP selama 12 bulan. Nilai yang belum tercatat ditampilkan sebagai jeda."
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={trend.map((r) => ({ ...r, label: months[r.month - 1] }))}
          margin={{ left: 0, right: 20, top: 20, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#e1e9ef" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#718293' }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            width={35}
            tick={{ fontSize: 11, fill: '#718293' }}
          />
          <Tooltip
            formatter={(v) => [number(Number(v)), 'Skor CKP']}
            contentStyle={{ border: '1px solid #e1e9ef', borderRadius: 8, fontSize: 12 }}
          />
          <Line
            type="linear"
            dataKey="score"
            stroke="#174c79"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 2, fill: 'white' }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
