import { Component, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, PeriodProvider, useAuth, usePeriod } from './lib/context';
import { FeedbackProvider, State, Empty } from './components/ui';
import { Layout } from './components/Layout';
import { Login, Password } from './pages/Auth';
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const EmployeeList = lazy(() =>
  import('./pages/Employees').then((m) => ({ default: m.EmployeeList })),
);
const EmployeeForm = lazy(() =>
  import('./pages/Employees').then((m) => ({ default: m.EmployeeForm })),
);
const EmployeeDetail = lazy(() =>
  import('./pages/Employees').then((m) => ({ default: m.EmployeeDetail })),
);
const Talent = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Talent })));
const Ckp = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Ckp })));
const Reports = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Reports })));
const Assessment = lazy(() =>
  import('./pages/Assessments').then((m) => ({ default: m.Assessment })),
);
const AssessmentOverview = lazy(() =>
  import('./pages/Assessments').then((m) => ({ default: m.AssessmentOverview })),
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
      <div className="fatal-error">
        <h1>Halaman tidak dapat dimuat.</h1>
        <p>Muat ulang untuk mencoba kembali.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Muat ulang
        </button>
      </div>
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
      ? user?.role === 'SUPER_ADMIN'
      : role === 'manager'
        ? user?.role !== 'PEGAWAI'
        : user?.role === 'PEGAWAI';
  return allowed ? <>{children}</> : <Navigate to="/" replace />;
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
        <Route index element={<Dashboard />} />
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
            <Guard role="manager">
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
            <Guard role="manager">
              <EmployeeForm />
            </Guard>
          }
        />
        <Route
          path="tim"
          element={
            <Guard role="manager">
              <Teams />
            </Guard>
          }
        />
        <Route
          path="penilaian"
          element={
            <Guard role="manager">
              <AssessmentOverview />
            </Guard>
          }
        />
        <Route path="peta-talenta" element={<Talent />} />
        <Route path="ckp" element={<Ckp />} />
        <Route
          path="pengaturan"
          element={
            <Guard role="manager">
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
              <Assessment key={`potential/${period?.id}`} />
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
        <Route
          path="kompetensi"
          element={
            <Guard role="employee">
              <EmployeeDetail self initialTab="kompetensi" />
            </Guard>
          }
        />
        <Route
          path="profil"
          element={
            <Guard role="employee">
              <EmployeeDetail self />
            </Guard>
          }
        />
        <Route
          path="penilaian-anggota"
          element={
            <Guard role="employee">
              <LeaderAssessments />
            </Guard>
          }
        />
        <Route path="akun" element={<Password />} />
        <Route
          path="*"
          element={
            <Empty
              title="Halaman tidak ditemukan"
              action={
                <Link to="/" className="btn btn-primary">
                  Kembali ke beranda
                </Link>
              }
            />
          }
        />
      </Route>
    </Routes>
  );
}
function Session() {
  const { user, loading } = useAuth();
  if (loading) return <State loading />;
  if (!user) return <Login />;
  if (user.must_change_password) return <Password forced />;
  return (
    <PeriodProvider>
      <Content />
    </PeriodProvider>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <FeedbackProvider>
          <AuthProvider>
            <Session />
          </AuthProvider>
        </FeedbackProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
