import { useState, Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  ChartColumnIncreasing,
  CalendarDays,
  FileBarChart,
  ShieldCheck,
  ScrollText,
  HeartPulse,
  BookOpen,
  Menu,
  ChevronDown,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth, usePeriod } from '../lib/context';
import { Button, Dialog, Badge, State } from './ui';
import { Brand } from './Brand';
import { AccountMenu } from './AccountMenu';
import './AppTheme.css';
const adminNav = [['/dashboard', 'Dashboard', LayoutDashboard]] as const;
const performanceNav = [
  ['/ckp', 'Capaian Kinerja Pegawai', ChartColumnIncreasing],
  ['/penghargaan', 'Penghargaan', ShieldCheck],
  ['/penilaian-ketua', 'Penilaian Ketua Tim', ClipboardCheck],
] as const;
const potentialNav = [
  ['/kompetensi', 'Kompetensi', BookOpen],
  ['/profil-dna', 'Potensi', ClipboardCheck],
  ['/kualifikasi', 'Kualifikasi', ShieldCheck],
] as const;
const otherMainNav = [['/psikologi', 'Hasil Psikologi', HeartPulse]] as const;
const administrationNav = [
  ['/pegawai', 'Pegawai', Users],
  ['/tim', 'Struktur Tim', Users],
  ['/pengaturan', 'Periode & Bank Soal', CalendarDays],
  ['/laporan', 'Laporan', FileBarChart],
  ['/pengguna', 'Pengguna & Peran', ShieldCheck],
  ['/audit', 'Audit Log', ScrollText],
] as const;
const employeeNav = [
  ['/dashboard', 'Beranda', LayoutDashboard],
  ['/asesmen-psikologi', 'Asesmen Psikologi', HeartPulse],
] as const;
export const roleLabel = { ADMIN: 'Admin', SUPERVISOR: 'Supervisor', PEGAWAI: 'Pegawai' };
export function Layout() {
  const pathname = useLocation().pathname;
  const dashboard = pathname === '/dashboard';
  const { user } = useAuth(),
    { period, periods, setPeriod } = usePeriod(),
    [mobile, setMobile] = useState(false),
    [compact, setCompact] = useState(false);
  const employee = user?.role === 'PEGAWAI';
  const currentPage =
    (employee
      ? [
          ...employeeNav,
          ...performanceNav,
          ...potentialNav,
          ['/asesmen-potensi', 'Potensi', ClipboardCheck] as const,
          ['/kinerja', 'Kinerja', ChartColumnIncreasing] as const,
          ['/potensial', 'Potensial', FileBarChart] as const,
        ]
      : [...adminNav, ...otherMainNav, ...administrationNav, ...performanceNav, ...potentialNav]
    ).find(([path]) => pathname === path)?.[1] ||
    ({ '/kinerja': 'Kinerja', '/potensial': 'Potensial' } as Record<string, string>)[pathname] ||
    (pathname === '/profil' ? 'Profil Saya' : 'Ruang kerja');
  const renderLinks = (items: ReadonlyArray<readonly [string, string, typeof Users]>) =>
    items.map(([path, label, Icon]) => (
      <NavLink
        key={path}
        to={path}
        end={path === '/dashboard'}
        aria-label={label}
        title={label}
        onClick={() => setMobile(false)}
      >
        <Icon size={18} />
        <span>{label}</span>
      </NavLink>
    ));
  const links = (
    <>
      <p className="nav-caption">MENU UTAMA</p>
      <nav aria-label="Menu utama">
        {renderLinks(employee ? employeeNav.slice(0, 1) : adminNav)}
        {[
          ['Kinerja', performanceNav, '/kinerja'],
          ['Potensial', potentialNav, '/potensial'],
        ].map(([title, items, href]) => (
          <div className="nav-talent-group" key={title as string}>
            <NavLink
              className="nav-parent nav-section-home"
              to={href as string}
              onClick={() => setMobile(false)}
              title={`Ringkasan ${title as string}`}
            >
              <Layers size={18} />
              <span>{title as string}</span>
            </NavLink>
            <nav className="nav-submenu" aria-label={title as string}>
              {renderLinks(
                (items as typeof potentialNav).map(
                  ([path, label, icon]) =>
                    [
                      employee && path === '/profil-dna' ? '/asesmen-potensi' : path,
                      label,
                      icon,
                    ] as const,
                ),
              )}
            </nav>
          </div>
        ))}
        {employee && renderLinks(employeeNav.slice(1))}
        {!employee && user?.role === 'ADMIN' && renderLinks(otherMainNav)}
        {user?.role === 'PEGAWAI' && user.is_leader && (
          <NavLink to="/penilaian-anggota" onClick={() => setMobile(false)}>
            <Users size={18} />
            Penilaian Anggota
          </NavLink>
        )}
      </nav>
      {!employee && (
        <>
          <p className="nav-caption secondary-caption">ADMINISTRASI</p>
          <nav aria-label="Administrasi">
            {renderLinks(
              administrationNav.filter(
                ([path]) => user?.role === 'ADMIN' || path === '/pegawai' || path === '/laporan',
              ),
            )}
          </nav>
        </>
      )}
    </>
  );
  return (
    <div
      className={`app-layout${dashboard ? ' dashboard-shell' : ''}${compact ? ' nav-compact' : ''}`}
    >
      <a className="skip-link" href="#main">
        Lewati ke konten utama
      </a>
      <aside className="sidebar" aria-label="Navigasi aplikasi">
        <Brand to="/dashboard" />
        {links}
      </aside>
      {mobile && (
        <Dialog title="Navigasi" onClose={() => setMobile(false)}>
          <div className="mobile-links">{links}</div>
        </Dialog>
      )}
      <div className="workspace">
        <header className="topbar">
          <Button
            className="desktop-nav-toggle"
            variant="ghost"
            aria-label={compact ? 'Perluas navigasi' : 'Ringkas navigasi'}
            aria-expanded={!compact}
            onClick={() => setCompact(!compact)}
          >
            {compact ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </Button>
          <Button
            className="mobile-toggle"
            variant="ghost"
            aria-label="Buka navigasi"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </Button>
          <div className="breadcrumb">
            <LayoutDashboard size={21} aria-hidden="true" />
            <div>
              <strong>{currentPage}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <label className="period-select">
              <CalendarDays size={16} />
              <span className="sr-only">Tahun penilaian</span>
              <select
                aria-label="Tahun penilaian"
                value={period?.id || ''}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {!periods.length && <option value="">Tanpa periode</option>}
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.year}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </label>
            <Badge tone={period?.status === 'OPEN' ? 'green' : 'neutral'}>
              {period?.status === 'OPEN'
                ? 'Periode aktif'
                : period?.status === 'CLOSED'
                  ? 'Periode ditutup'
                  : 'Draft'}
            </Badge>
            <AccountMenu />
          </div>
        </header>
        <main id="main" className="main">
          {period?.demo_data && (
            <div className="demo-data-notice" role="note">
              <strong>Data dummy sementara · {period.year}</strong>
              <span>
                Pelatihan, penghargaan, tim dan nilai pada periode ini adalah simulasi aplikasi,
                bukan penilaian pegawai yang sebenarnya.
              </span>
            </div>
          )}
          <Suspense fallback={<State loading />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="workspace-footer">
          <span>Talenta BPS · BPS Kota Batu</span>
          <span>Potensi bertumbuh. Kinerja berdampak.</span>
        </footer>
      </div>
    </div>
  );
}
