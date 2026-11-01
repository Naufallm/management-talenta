import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ClipboardCheck,
  BookOpen,
  ChartColumnIncreasing,
  ArrowRight,
} from 'lucide-react';
import { useApi, useAuth, usePeriod } from '../lib/context';
import { PageHeader, Panel, State, Badge, number, Empty } from '../components/ui';
import { Metric } from './Employees';
import { TalentChart } from '../components/Charts';
import type { TalentPoint, ScoreConfig } from '../../shared/contracts';
export function Dashboard() {
  const { user } = useAuth(),
    { period, error, loading } = usePeriod(),
    isManager = user?.role !== 'PEGAWAI';
  const summary = useApi(period ? `/dashboard/${period.id}` : null),
    points = useApi<TalentPoint[]>(period ? `/talent/${period.id}` : null),
    config = useApi<ScoreConfig>(period ? `/periods/${period.id}/config` : null);
  const own = useApi(
      !isManager && period && user?.employee_id ? `/employees/${user.employee_id}` : null,
    ),
    potential = own.data?.potential.find((s: any) => s.period_id === period?.id);
  const data = summary.data,
    completed = data?.submitted || 0,
    total = data?.employees || 0;
  return (
    <>
      <PageHeader
        title={isManager ? 'Dashboard' : `Selamat datang, ${user?.name.split(' ')[0]}.`}
        description={
          isManager
            ? `Gambaran talenta dan perkembangan pegawai · Tahun ${period?.year || '—'}`
            : 'Lihat perkembangan Anda dan tuntaskan penilaian periode ini.'
        }
        actions={
          user?.role === 'ADMIN' && (
            <Link className="btn btn-secondary" to="/laporan">
              Lihat laporan
              <ArrowUpRight size={16} />
            </Link>
          )
        }
      />
      <State
        loading={loading || summary.loading}
        error={error || summary.error}
        retry={summary.refresh}
      >
        {!period ? (
          <Empty
            title="Belum ada periode"
            description="Admin perlu membuat periode penilaian terlebih dahulu."
          />
        ) : (
          <>
            <div className="metric-grid">
              <Metric
                label={isManager ? 'Pegawai aktif' : 'Potensi saya'}
                value={isManager ? number(data?.employees) : number(potential?.score)}
                hint={isManager ? 'Terdaftar dalam sistem' : 'Sumbu X peta talenta'}
              />
              <Metric
                label={isManager ? 'Rata-rata kompetensi' : 'Kompetensi saya'}
                value={number(data?.competency)}
                hint="Bukti kegiatan & penilaian Ketua Tim"
              />
              <Metric
                label="Rata-rata CKP"
                value={number(data?.ckp)}
                hint={`Kinerja bulanan ${period.year}`}
              />
              <Metric
                label={isManager ? 'Talenta Unggul' : 'Posisi talenta saya'}
                value={
                  isManager
                    ? number(data?.excellent)
                    : points.data?.[0]?.quadrant || 'Belum tersedia'
                }
                hint={
                  isManager ? 'Pegawai di kuadran kanan atas' : 'Berdasarkan potensi & kompetensi'
                }
              />
            </div>
            <div className="dashboard-grid">
              <Panel
                title="Peta Talenta"
                description="Potensi dan kompetensi pegawai, dalam satu pandangan."
                actions={
                  <Link className="icon-link" to="/peta-talenta" aria-label="Buka peta talenta">
                    <ArrowUpRight size={19} />
                  </Link>
                }
              >
                <State
                  loading={points.loading || config.loading}
                  error={points.error || config.error}
                  retry={points.refresh}
                >
                  {config.data && points.data && (
                    <TalentChart points={points.data} config={config.data} self={!isManager} />
                  )}
                </State>
              </Panel>
              <Panel title="Periode berjalan" description={period.name} className="tasks-panel">
                <div className="period-progress">
                  <div>
                    <span>Asesmen potensi terkirim</span>
                    <strong>
                      {completed}
                      <small> / {total}</small>
                    </strong>
                  </div>
                  <progress
                    value={completed}
                    max={total || 1}
                    aria-label="Asesmen potensi terkirim"
                  />
                  <span>{total ? Math.round((completed / total) * 100) : 0}% selesai</span>
                </div>
                <div className="task-list">
                  {[
                    [
                      user?.role === 'SUPERVISOR'
                        ? '/pegawai'
                        : isManager
                          ? '/penilaian'
                          : '/asesmen-potensi',
                      user?.role === 'SUPERVISOR' ? 'Feedback pegawai' : 'Asesmen tahunan',
                      user?.role === 'SUPERVISOR'
                        ? 'Berikan masukan kapan saja'
                        : 'Tinjau penilaian potensi',
                      ClipboardCheck,
                    ],
                    [
                      isManager ? '/pegawai' : '/kompetensi',
                      'Pelatihan & penghargaan',
                      user?.role === 'SUPERVISOR'
                        ? 'Lihat bukti kompetensi pegawai'
                        : 'Lengkapi bukti kompetensi',
                      BookOpen,
                    ],
                    ['/ckp', 'Kinerja CKP', 'Pantau capaian bulanan', ChartColumnIncreasing],
                  ].map(([path, title, desc, Icon]: any) => (
                    <Link key={path} to={path}>
                      <span className="task-icon">
                        <Icon size={19} />
                      </span>
                      <span>
                        <strong>{title}</strong>
                        <small>{desc}</small>
                      </span>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
                <div className="period-bottom">
                  <Badge tone={period.status === 'OPEN' ? 'green' : 'neutral'}>
                    {period.status === 'OPEN' ? 'Terbuka' : 'Tidak terbuka'}
                  </Badge>
                  <span>{period.year}</span>
                </div>
              </Panel>
            </div>
            <div className="info-strip">
              <span className="info-number">01</span>
              <div>
                <strong>Kenali potensi. Arahkan pengembangan.</strong>
                <p>
                  Peta talenta memakai potensi dan kompetensi. CKP dicatat sebagai aspek kinerja
                  tersendiri.
                </p>
              </div>
              <Link to="/peta-talenta" className="text-link">
                Jelajahi peta
                <ArrowRight size={15} />
              </Link>
            </div>
          </>
        )}
      </State>
    </>
  );
}
