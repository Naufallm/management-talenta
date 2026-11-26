import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  ClipboardCheck,
  BookOpen,
  ChartColumnIncreasing,
  Users,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { useApi, useAuth, usePeriod } from '../lib/context';
import { PageHeader, Panel, State, Badge, number, Empty, Pagination, date } from '../components/ui';
import { TalentChart, CkpChart } from '../components/Charts';
import { EmployeeAvatar } from '../components/EmployeeAvatar';
import type { TalentPoint, ScoreConfig, Quadrant } from '../../shared/contracts';
import { months } from '../../shared/constants';
import { dnaClusterInfo, type DnaAssessment } from '../../shared/potential-dna';
import './Dashboard.css';

interface Summary {
  employees: number;
  submitted: number;
  competency: number | null;
  ckp: number | null;
  excellent: number;
}
interface OwnData {
  ckp: { year: number; month: number; score: number }[];
}
interface ReportRow {
  employee_id: string;
  name: string;
  nip: string;
  unit: string;
  potential: number | null;
  competency: number | null;
  ckp: number | null;
  quadrant: Quadrant | null;
}

export function Dashboard() {
  const { user } = useAuth();
  const { period } = usePeriod();
  const isManager = user?.role !== 'PEGAWAI';
  const [chart, setChart] = useState<'talent' | 'ckp'>('talent');
  const summary = useApi<Summary>(period ? `/dashboard/${period.id}` : null);
  const points = useApi<TalentPoint[]>(period ? `/talent/${period.id}` : null);
  const config = useApi<ScoreConfig>(period ? `/periods/${period.id}/config` : null);
  const own = useApi<OwnData>(
    !isManager && period && user?.employee_id ? `/employees/${user.employee_id}` : null,
  );
  const ckp = useApi<{ trend: { month: number; score: number | null }[] }>(
    period && chart === 'ckp' ? `/ckp?year=${period.year}&limit=1` : null,
  );
  const dna = useApi<DnaAssessment>(
    !isManager && period && user?.employee_id
      ? `/potential-dna/${period.id}/${user.employee_id}`
      : null,
  );
  const completed = isManager ? summary.data?.submitted || 0 : dna.data?.submitted_at ? 1 : 0;
  const total = summary.data?.employees || 0;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const tasks: { path: string; title: string; description: string; icon: LucideIcon }[] = [
    {
      path:
        user?.role === 'SUPERVISOR' ? '/pegawai' : isManager ? '/penilaian' : '/asesmen-potensi',
      title: user?.role === 'SUPERVISOR' ? 'Feedback pegawai' : 'Asesmen potensi',
      description:
        user?.role === 'SUPERVISOR'
          ? 'Berikan masukan pengembangan'
          : isManager
            ? 'Tinjau jawaban dan progres'
            : dna.data?.submitted_at
              ? 'Lihat profil dan kecenderungan formasi'
              : 'Isi dan kirim asesmen Anda',
      icon: ClipboardCheck,
    },
    {
      path:
        user?.role === 'ADMIN'
          ? '/penilaian?jenis=kompetensi'
          : isManager
            ? '/pegawai'
            : '/kompetensi',
      title: 'Bukti kompetensi',
      description: isManager
        ? 'Pelatihan, penghargaan & Ketua Tim'
        : 'Lengkapi sertifikat kegiatan',
      icon: BookOpen,
    },
    {
      path: '/ckp',
      title: 'Capaian Kinerja Pegawai',
      description: 'Lihat capaian kinerja bulanan',
      icon: ChartColumnIncreasing,
    },
  ];
  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <EmployeeAvatar size="card" employeeId={user?.employee_id} version={user?.photo_version} />
        <PageHeader
          title={isManager ? 'Dashboard' : `Selamat datang, ${user?.name.split(' ')[0]}.`}
          description={
            isManager
              ? `Selamat datang kembali. Pantau perkembangan talenta · Tahun ${period?.year || '—'}`
              : `Ringkasan penilaian dan perkembangan Anda · Tahun ${period?.year || '—'}`
          }
          actions={
            <Link className="btn btn-secondary" to={isManager ? '/laporan' : '/profil'}>
              <Eye size={16} aria-hidden="true" />
              {isManager ? 'Lihat laporan' : 'Lihat profil'}
            </Link>
          }
        />
      </div>
      <State loading={summary.loading} error={summary.error} retry={summary.refresh}>
        {!period ? (
          <Panel>
            <Empty
              title="Belum ada periode"
              description="Admin perlu membuat periode penilaian terlebih dahulu."
            />
          </Panel>
        ) : (
          <>
            <div className="dashboard-stats">
              {isManager ? (
                <Stat
                  label="Pegawai aktif"
                  value={number(summary.data?.employees)}
                  hint="Terdaftar dalam sistem"
                  icon={Users}
                  tone="blue"
                />
              ) : (
                <PotentialStat state={dna} year={period.year} />
              )}
              <Stat
                label={isManager ? 'Rata-rata kompetensi' : 'Kompetensi saya'}
                value={number(summary.data?.competency)}
                hint="Bukti kegiatan & Ketua Tim"
                icon={BookOpen}
                tone="teal"
                suffix="/ 100"
              />
              <Stat
                label="Rata-rata Capaian Kinerja Pegawai"
                value={number(summary.data?.ckp)}
                hint={`Nilai bulanan tercatat · ${period.year}`}
                icon={ChartColumnIncreasing}
                tone="orange"
                suffix="/ 100"
              />
              <Stat
                label={isManager ? 'Talenta Unggul' : 'Kuadran saya'}
                value={
                  isManager
                    ? number(summary.data?.excellent)
                    : points.data?.[0]?.quadrant || 'Belum tersedia'
                }
                hint={
                  isManager
                    ? `${total ? number(((summary.data?.excellent || 0) / total) * 100) : '0'}% dari pegawai aktif`
                    : 'Berdasarkan potensi & kompetensi'
                }
                icon={Sparkles}
                tone="green"
                badge={
                  isManager
                    ? `${total ? number(((summary.data?.excellent || 0) / total) * 100) : '0'}%`
                    : undefined
                }
              />
            </div>
            <div className="dashboard-content-grid">
              <Panel
                className="dashboard-visual"
                title={chart === 'talent' ? 'Peta Talenta' : 'Tren Capaian Kinerja Pegawai'}
                description={
                  chart === 'talent'
                    ? 'Pemetaan potensi dan kompetensi pada periode terpilih.'
                    : 'Rata-rata Capaian Kinerja Pegawai per bulan; bulan tanpa nilai ditampilkan sebagai jeda.'
                }
                actions={
                  <Link
                    className="text-link"
                    to={chart === 'talent' ? '/peta-talenta' : '/ckp'}
                    aria-label={
                      chart === 'talent' ? 'Buka peta talenta' : 'Buka Capaian Kinerja Pegawai'
                    }
                  >
                    <Eye size={15} aria-hidden="true" />
                    Lihat detail
                  </Link>
                }
              >
                <div
                  className="dashboard-chart-tabs"
                  role="group"
                  aria-label="Tampilan grafik dashboard"
                >
                  <button
                    type="button"
                    aria-pressed={chart === 'talent'}
                    onClick={() => setChart('talent')}
                  >
                    Peta Talenta
                  </button>
                  <button
                    type="button"
                    aria-pressed={chart === 'ckp'}
                    aria-label="Tren Capaian Kinerja Pegawai"
                    onClick={() => setChart('ckp')}
                  >
                    Tren Kinerja
                  </button>
                  <span className="dashboard-chart-year">
                    <CalendarDays size={13} aria-hidden="true" />
                    {period.year}
                  </span>
                </div>
                {chart === 'talent' ? (
                  <State
                    loading={points.loading || config.loading}
                    error={points.error || config.error}
                    retry={() => {
                      points.refresh();
                      config.refresh();
                    }}
                  >
                    {config.data && points.data && (
                      <TalentChart points={points.data} config={config.data} self={!isManager} />
                    )}
                  </State>
                ) : (
                  <State {...ckp} retry={ckp.refresh}>
                    {ckp.data && (
                      <CkpChart trend={ckp.data.trend} variant="area" accent="#2c3cdd" />
                    )}
                  </State>
                )}
                <div className="dashboard-chart-note">
                  <span className="dashboard-note-dot" />
                  {chart === 'talent'
                    ? `${points.data?.length ?? 0} ${isManager ? 'pegawai memiliki' : 'posisi dengan'} skor potensi dan kompetensi lengkap`
                    : 'Skala 0–100 · Capaian Kinerja Pegawai dicatat terpisah dari posisi kuadran'}
                </div>
              </Panel>
              <div className="dashboard-side">
                <Panel
                  className="dashboard-period"
                  title="Progres penilaian"
                  description={period.name}
                  actions={
                    <Badge tone={period.status === 'OPEN' ? 'green' : 'neutral'}>
                      {period.status === 'OPEN'
                        ? 'Aktif'
                        : period.status === 'CLOSED'
                          ? 'Ditutup'
                          : 'Draft'}
                    </Badge>
                  }
                >
                  <State
                    loading={!isManager && dna.loading}
                    error={isManager ? '' : dna.error}
                    retry={dna.refresh}
                  >
                    <div className="dashboard-progress-overview">
                      <div
                        className="dashboard-progress-gauge"
                        role="progressbar"
                        aria-label="Progres pengiriman asesmen potensi"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuetext={`${completed} dari ${total} asesmen potensi terkirim`}
                      >
                        <svg viewBox="0 0 208 125" aria-hidden="true">
                          <path className="gauge-track" d="M 14 104 A 90 90 0 0 1 194 104" />
                          <path
                            className="gauge-value"
                            d="M 14 104 A 90 90 0 0 1 194 104"
                            pathLength="100"
                            strokeDasharray={`${progress} 100`}
                          />
                          <text className="gauge-number" x="104" y="85">
                            {progress}%
                          </text>
                          <text className="gauge-caption" x="104" y="108">
                            Selesai
                          </text>
                        </svg>
                      </div>
                      <div className="dashboard-progress-text">
                        <strong>
                          {completed} dari {total}
                        </strong>
                        <span>asesmen potensi terkirim</span>
                        <small>
                          <Clock3 size={12} aria-hidden="true" />
                          {Math.max(0, total - completed)} belum terkirim
                        </small>
                      </div>
                    </div>
                  </State>
                  <div className="dashboard-period-end">
                    <CalendarDays size={14} aria-hidden="true" />
                    <span>
                      Akhir periode <strong>{date(period.ends_on)}</strong>
                    </span>
                  </div>
                </Panel>
                <Panel
                  className="dashboard-actions"
                  title="Akses cepat"
                  description="Lanjutkan pengelolaan talenta Anda."
                >
                  <div className="dashboard-shortcuts">
                    {tasks.map(({ path, title, description, icon: Icon }) => (
                      <Link to={path} key={title}>
                        <span className="dashboard-task-icon">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{title}</strong>
                          <small>{description}</small>
                        </span>
                        <Eye size={15} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
            {isManager ? (
              <EmployeeRecords key={period.id} periodId={period.id} year={period.year} />
            ) : (
              <Panel
                className="dashboard-records dashboard-own-records"
                title="Riwayat Capaian Kinerja Pegawai saya"
                description={`Nilai bulanan terakhir yang tercatat pada tahun ${period.year}.`}
                actions={
                  <Link to="/ckp" className="text-link">
                    <Eye size={15} aria-hidden="true" />
                    Lihat semua
                  </Link>
                }
              >
                <State {...own} retry={own.refresh}>
                  {own.data && (
                    <PersonalRecords
                      rows={own.data.ckp.filter((row) => row.year === period.year)}
                    />
                  )}
                </State>
              </Panel>
            )}
            <p className="dashboard-footnote">
              <CheckCircle2 size={15} aria-hidden="true" />
              Peta talenta menggunakan potensi dan kompetensi. Capaian Kinerja Pegawai dicatat
              sebagai aspek kinerja tersendiri.
            </p>
          </>
        )}
      </State>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  suffix,
  badge,
  children,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  suffix?: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <section className={`dashboard-stat dashboard-stat-${tone}`} aria-label={label}>
      <div className="dashboard-stat-top">
        <span className="dashboard-stat-label">
          <span className="dashboard-stat-icon">
            <Icon size={16} aria-hidden="true" />
          </span>
          <span>{label}</span>
        </span>
        <Info className="dashboard-stat-info" size={14} aria-hidden="true" />
      </div>
      <div className={`dashboard-stat-value${value.length > 10 ? ' dashboard-stat-long' : ''}`}>
        <strong>{value}</strong>
        {suffix && <span>{suffix}</span>}
        {badge && <span className="dashboard-stat-badge">{badge}</span>}
      </div>
      <p>
        <span />
        {hint}
      </p>
      {children}
    </section>
  );
}

function PotentialStat({
  state,
  year,
}: {
  state: ReturnType<typeof useApi<DnaAssessment>>;
  year: number;
}) {
  const result = state.data?.submitted_at ? state.data.result : null;
  const count = Object.keys(state.data?.answers || {}).length;
  const value = result
    ? result.dominant.map((cluster) => dnaClusterInfo[cluster].name).join(' · ')
    : state.loading
      ? 'Memuat…'
      : state.error
        ? 'Gagal memuat'
        : count
          ? 'Draft'
          : 'Belum diisi';
  const hint = result
    ? `Profil potensi · ${year}`
    : state.loading
      ? 'Memuat hasil asesmen'
      : state.error
        ? 'Hasil belum dapat ditampilkan'
        : count
          ? `${count} dari 30 pernyataan terjawab`
          : `Asesmen tahun ${year} belum dikirim`;
  return (
    <Stat label="Potensi saya" value={value} hint={hint} icon={ClipboardCheck} tone="blue">
      <div className="dashboard-potential-formation">
        <span>Kecenderungan formasi</span>
        {result ? (
          <ul>
            {result.formations
              .filter((formation) => formation.rank === 1)
              .map((formation) => (
                <li key={formation.id}>
                  <strong>{formation.name}</strong>
                  <span>{number(formation.match)}% kemiripan</span>
                </li>
              ))}
          </ul>
        ) : (
          <p>
            {state.error ? 'Coba muat ulang hasil asesmen.' : 'Tersedia setelah asesmen dikirim.'}
          </p>
        )}
      </div>
      {state.error ? (
        <button
          className="text-link dashboard-potential-link"
          type="button"
          onClick={state.refresh}
        >
          Coba lagi
        </button>
      ) : (
        !state.loading && (
          <Link className="text-link dashboard-potential-link" to="/asesmen-potensi">
            <Eye size={14} aria-hidden="true" />
            {result ? 'Lihat hasil' : count ? 'Lanjutkan pengisian' : 'Isi asesmen'}
          </Link>
        )
      )}
    </Stat>
  );
}

function EmployeeRecords({ periodId, year }: { periodId: string; year: number }) {
  const [page, setPage] = useState(1);
  const state = useApi<{ rows: ReportRow[]; total: number; limit: number }>(
    `/reports/${periodId}?limit=5&page=${page}`,
  );
  return (
    <Panel
      className="dashboard-records"
      title="Ringkasan talenta pegawai"
      description={`Potensi, kompetensi, dan kinerja pada tahun ${year}.`}
      actions={
        <Link className="text-link" to="/pegawai">
          <Users size={15} aria-hidden="true" />
          Lihat semua pegawai
        </Link>
      }
    >
      <State {...state} retry={state.refresh}>
        {state.data?.rows.length ? (
          <>
            <p className="dashboard-table-hint">Geser tabel untuk melihat seluruh nilai.</p>
            <div
              className="table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Tabel ringkasan talenta pegawai"
            >
              <table>
                <caption className="sr-only">Ringkasan talenta pegawai tahun {year}</caption>
                <thead>
                  <tr>
                    <th>Pegawai</th>
                    <th>Unit kerja</th>
                    <th>Potensi</th>
                    <th>Kompetensi</th>
                    <th>Rata-rata kinerja</th>
                    <th>Kuadran</th>
                    <th>
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.rows.map((row) => (
                    <tr key={row.employee_id}>
                      <td>
                        <Link className="dashboard-person" to={`/pegawai/${row.employee_id}`}>
                          <EmployeeAvatar />
                          <span>
                            <strong>{row.name}</strong>
                            <small className="mono">{row.nip}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{row.unit}</td>
                      <td>{number(row.potential)}</td>
                      <td>{number(row.competency)}</td>
                      <td>{number(row.ckp)}</td>
                      <td>
                        <Badge
                          tone={
                            row.quadrant === 'Talenta Unggul'
                              ? 'green'
                              : row.quadrant === 'Talenta Berkembang'
                                ? 'orange'
                                : row.quadrant
                                  ? 'blue'
                                  : 'neutral'
                          }
                        >
                          {row.quadrant || 'Belum lengkap'}
                        </Badge>
                      </td>
                      <td>
                        <Link
                          className="icon-link"
                          to={`/pegawai/${row.employee_id}`}
                          aria-label={`Lihat profil ${row.name}`}
                          title={`Lihat profil ${row.name}`}
                        >
                          <Eye size={16} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dashboard-records-footer">
              <span>
                Menampilkan {state.data.rows.length} dari {state.data.total} pegawai · Skor 0–100
              </span>
              {state.data.total > 5 && (
                <Pagination page={page} total={state.data.total} limit={5} onPage={setPage} />
              )}
            </div>
          </>
        ) : (
          <Empty
            title="Belum ada pegawai aktif"
            description="Data akan tampil setelah pegawai ditambahkan melalui Administrasi."
          />
        )}
      </State>
    </Panel>
  );
}

function PersonalRecords({ rows }: { rows: OwnData['ckp'] }) {
  if (!rows.length)
    return (
      <Empty
        title="Belum ada Capaian Kinerja Pegawai"
        description="Nilai kinerja akan tampil setelah dicatat pada tahun ini."
      />
    );
  const latest = [...rows].sort((a, b) => b.month - a.month).slice(0, 5);
  return (
    <>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Riwayat nilai Capaian Kinerja Pegawai saya</caption>
          <thead>
            <tr>
              <th>Bulan</th>
              <th>Tahun</th>
              <th>Nilai kinerja</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((row) => (
              <tr key={row.month}>
                <td>{months[row.month - 1]}</td>
                <td>{row.year}</td>
                <td>
                  <strong>{number(row.score)}</strong>
                </td>
                <td>
                  <Badge tone="green">Tercatat</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dashboard-records-footer">
        Menampilkan {latest.length} dari {rows.length} bulan tercatat · Skor 0–100
      </div>
    </>
  );
}
