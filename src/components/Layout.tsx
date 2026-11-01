import { useState, Suspense } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  ChartScatter,
  ChartColumnIncreasing,
  CalendarDays,
  FileBarChart,
  ShieldCheck,
  ScrollText,
  HeartPulse,
  UserRound,
  BookOpen,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { useAuth, usePeriod } from '../lib/context';
import { Button, Dialog, useFeedback, Badge, State } from './ui';
const adminNav = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/pegawai', 'Pegawai', Users],
  ['/penilaian', 'Penilaian', ClipboardCheck],
  ['/peta-talenta', 'Peta Talenta', ChartScatter],
  ['/ckp', 'Kinerja CKP', ChartColumnIncreasing],
  ['/pengaturan', 'Periode & Bank Soal', CalendarDays],
  ['/laporan', 'Laporan', FileBarChart],
] as const;
const employeeNav = [
  ['/', 'Beranda', LayoutDashboard],
  ['/asesmen-potensi', 'Asesmen Potensi', ClipboardCheck],
  ['/kompetensi', 'Kompetensi Saya', BookOpen],
  ['/peta-talenta', 'Peta Talenta Saya', ChartScatter],
  ['/ckp', 'Kinerja CKP Saya', ChartColumnIncreasing],
  ['/asesmen-psikologi', 'Asesmen Psikologi', HeartPulse],
  ['/profil', 'Profil Saya', UserRound],
] as const;
export const roleLabel = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', PEGAWAI: 'Pegawai' };
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Talenta BPS Kota Batu">
      <span className="brand-mark">B</span>
      <span>
        <strong>TALENTA</strong>
        <small>BPS KOTA BATU</small>
      </span>
    </Link>
  );
}
export function Layout() {
  const { user, logout } = useAuth(),
    { period, periods, setPeriod } = usePeriod(),
    { run } = useFeedback(),
    [mobile, setMobile] = useState(false);
  const nav = user?.role === 'PEGAWAI' ? employeeNav : adminNav;
  const links = (
    <>
      <p className="nav-caption">MENU UTAMA</p>
      <nav aria-label="Menu utama">
        {nav.map(([path, label, Icon]) => (
          <NavLink key={path} to={path} end={path === '/'} onClick={() => setMobile(false)}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        {user?.role === 'PEGAWAI' && user.is_leader && (
          <NavLink to="/penilaian-anggota" onClick={() => setMobile(false)}>
            <Users size={18} />
            Penilaian Anggota
          </NavLink>
        )}
      </nav>
      {user?.role === 'SUPER_ADMIN' && (
        <>
          <p className="nav-caption secondary-caption">ADMINISTRASI</p>
          <nav aria-label="Administrasi">
            <NavLink to="/psikologi" onClick={() => setMobile(false)}>
              <HeartPulse size={18} />
              Hasil Psikologi
            </NavLink>
            <NavLink to="/pengguna" onClick={() => setMobile(false)}>
              <ShieldCheck size={18} />
              Pengguna & Peran
            </NavLink>
            <NavLink to="/audit" onClick={() => setMobile(false)}>
              <ScrollText size={18} />
              Audit Log
            </NavLink>
          </nav>
        </>
      )}
      {user && (
        <div className="sidebar-account">
          <span className="avatar small">{user.name.charAt(0)}</span>
          <div>
            <strong>{roleLabel[user.role]}</strong>
            <small>{user.name}</small>
          </div>
          <Button
            variant="ghost"
            aria-label="Keluar"
            title="Keluar"
            onClick={() => void run(logout)}
          >
            <LogOut size={17} />
          </Button>
        </div>
      )}
    </>
  );
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main">
        Lewati ke konten utama
      </a>
      <aside className="sidebar">
        <Brand />
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
            className="mobile-toggle"
            variant="ghost"
            aria-label="Buka navigasi"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </Button>
          <div className="breadcrumb">
            <span>BPS KOTA BATU</span>
            <span>/</span>
            <span>SISTEM MANAJEMEN TALENTA</span>
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
            <Link className="avatar top-avatar" to="/akun" aria-label="Pengaturan akun">
              {user?.name.charAt(0)}
            </Link>
          </div>
        </header>
        <main id="main" className="main">
          <Suspense fallback={<State loading />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="workspace-footer">
          <span>Talenta · BPS Kota Batu</span>
          <span>Potensi bertumbuh. Kinerja berdampak.</span>
        </footer>
      </div>
    </div>
  );
}
