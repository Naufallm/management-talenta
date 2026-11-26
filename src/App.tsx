import { Component, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, PeriodProvider, useAuth, usePeriod } from './lib/context';
import { FeedbackProvider, State } from './components/ui';
import { ErrorPage } from './components/ErrorPage';
import { Layout } from './components/Layout';
import { Login, Password } from './pages/Auth';
import { Home } from './pages/Home';
const Dashboard = lazy(() => import('./pages/NineBox').then((m) => ({ default: m.NineBoxPage })));
const EmployeeList = lazy(() =>
  import('./pages/Employees').then((m) => ({ default: m.EmployeeList })),
);
const EmployeeForm = lazy(() =>
  import('./pages/Employees').then((m) => ({ default: m.EmployeeForm })),
);
const EmployeeDetail = lazy(() =>
  import('./pages/Employees').then((m) => ({ default: m.EmployeeDetail })),
);
const Ckp = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Ckp })));
const Reports = lazy(() => import('./pages/NineBox').then((m) => ({ default: m.NineBoxReports })));
const Assessment = lazy(() =>
  import('./pages/Assessments').then((m) => ({ default: m.Assessment })),
);
const PotentialDna = lazy(() =>
  import('./pages/PotentialDna').then((m) => ({ default: m.PotentialDna })),
);
const AssessmentOverview = lazy(() =>
  import('./pages/AssessmentOverview').then((m) => ({ default: m.AssessmentOverview })),
);
const LeaderAssessments = lazy(() =>
  import('./pages/Assessments').then((m) => ({ default: m.LeaderAssessments })),
);
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Teams = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Teams })));
const UsersPage = lazy(() =>
  import('./pages/Administration').then((m) => ({ default: m.UsersPage })),
);
const Audit = lazy(() => import('./pages/Administration').then((m) => ({ default: m.Audit })));
const PsychologyResults = lazy(() =>
  import('./pages/Administration').then((m) => ({ default: m.PsychologyResults })),
);
const AxisPage = lazy(() => import('./pages/NineBox').then((m) => ({ default: m.AxisPage })));
const NineBoxRecords = lazy(() =>
  import('./pages/NineBoxRecords').then((m) => ({ default: m.NineBoxRecords })),
);
const PotentialSectionPage = lazy(() =>
  import('./pages/NineBoxRecords').then((m) => ({ default: m.PotentialSectionPage })),
);
function SectionRedirect({ section, part }: { section: string; part: string }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('bagian', part);
  return <Navigate to={'/' + section + '?' + params.toString()} replace />;
}
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error) {
    console.error(error);
  }
  render() {
    return this.state.error ? (
      <ErrorPage unexpected homeHref="/" onRetry={() => window.location.reload()} />
    ) : (
      this.props.children
    );
  }
}
function Guard({
  children,
  role,
}: {
  children: ReactNode;
  role: 'manager' | 'super' | 'employee';
}) {
  const { user } = useAuth();
  const allowed =
    role === 'super'
      ? user?.role === 'ADMIN'
      : role === 'manager'
        ? user?.role !== 'PEGAWAI'
        : user?.role === 'PEGAWAI';
  return allowed ? <>{children}</> : <Navigate to="/dashboard" replace />;
}
function OwnProfile() {
  const { user } = useAuth();
  return user?.employee_id ? <EmployeeDetail self /> : <Navigate to="/akun" replace />;
}
function Content() {
  const { period, error, loading } = usePeriod();
  if (loading || error)
    return (
      <div className="main">
        <State loading={loading} error={error} />
      </div>
    );
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="dashboard" element={<Dashboard dashboard />} />
        <Route
          path="pegawai"
          element={
            <Guard role="manager">
              <EmployeeList />
            </Guard>
          }
        />
        <Route
          path="pegawai/tambah"
          element={
            <Guard role="super">
              <EmployeeForm />
            </Guard>
          }
        />
        <Route
          path="pegawai/:id"
          element={
            <Guard role="manager">
              <EmployeeDetail />
            </Guard>
          }
        />
        <Route
          path="pegawai/:id/edit"
          element={
            <Guard role="super">
              <EmployeeForm />
            </Guard>
          }
        />
        <Route
          path="tim"
          element={
            <Guard role="super">
              <Teams />
            </Guard>
          }
        />
        <Route
          path="penilaian"
          element={
            <Guard role="super">
              <AssessmentOverview />
            </Guard>
          }
        />
        <Route path="peta-talenta" element={<Navigate to="/dashboard" replace />} />
        <Route path="ckp" element={<Ckp />} />
        <Route path="kinerja" element={<AxisPage axis="y" />} />
        <Route path="potensial" element={<AxisPage axis="x" />} />
        <Route
          path="pelatihan"
          element={<SectionRedirect section="kompetensi" part="pelatihan" />}
        />
        <Route path="penghargaan" element={<NineBoxRecords kind="awards" />} />
        <Route
          path="pendidikan"
          element={<SectionRedirect section="kualifikasi" part="pendidikan" />}
        />
        <Route
          path="pengalaman-jabatan"
          element={<SectionRedirect section="kompetensi" part="pengalaman" />}
        />
        <Route
          path="profil-dna"
          element={
            <Guard role="manager">
              <NineBoxRecords kind="dna" />
            </Guard>
          }
        />
        <Route path="penilaian-ketua" element={<NineBoxRecords kind="leader" />} />
        <Route
          path="kesesuaian-ilmu"
          element={<SectionRedirect section="kualifikasi" part="kesesuaian" />}
        />
        <Route
          path="pengaturan"
          element={
            <Guard role="super">
              <Settings />
            </Guard>
          }
        />
        <Route
          path="laporan"
          element={
            <Guard role="manager">
              <Reports />
            </Guard>
          }
        />
        <Route
          path="pengguna"
          element={
            <Guard role="super">
              <UsersPage />
            </Guard>
          }
        />
        <Route
          path="audit"
          element={
            <Guard role="super">
              <Audit />
            </Guard>
          }
        />
        <Route
          path="psikologi"
          element={
            <Guard role="super">
              <PsychologyResults />
            </Guard>
          }
        />
        <Route
          path="asesmen-potensi"
          element={
            <Guard role="employee">
              <PotentialDna />
            </Guard>
          }
        />
        <Route
          path="asesmen-psikologi"
          element={
            <Guard role="employee">
              <Assessment key={`psych/${period?.id}`} kind="psych" />
            </Guard>
          }
        />
        <Route path="kompetensi" element={<PotentialSectionPage section="competency" />} />
        <Route path="kualifikasi" element={<PotentialSectionPage section="qualification" />} />
        <Route path="profil" element={<OwnProfile />} />
        <Route
          path="penilaian-anggota"
          element={
            <Guard role="employee">
              <LeaderAssessments />
            </Guard>
          }
        />
        <Route path="akun" element={<Password />} />
      </Route>
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}
function Session() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <State loading />;
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search + location.hash }}
        replace
      />
    );
  if (user.must_change_password) return <Password forced />;
  return (
    <PeriodProvider>
      <Content />
    </PeriodProvider>
  );
}
function LoginRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <State loading />;
  if (!user) return <Login />;
  const from: unknown = location.state?.from;
  const destination =
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    from.split(/[?#]/)[0] !== '/login'
      ? from
      : '/dashboard';
  return <Navigate to={destination} replace />;
}
function NotFoundRoute() {
  const { user } = useAuth();
  return <ErrorPage homeHref={user ? '/dashboard' : '/'} />;
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <FeedbackProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/404" element={<NotFoundRoute />} />
              <Route path="*" element={<Session />} />
            </Routes>
          </AuthProvider>
        </FeedbackProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
