import { BoxPosition, ScoreBreakdown } from '../components/NineBoxMatrix';
import type { NineBoxResponse } from '../../shared/nine-box';
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowLeft,
  Eye,
  Pencil,
  Users,
  Mail,
  Phone,
  Building2,
  KeyRound,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { useApi, useAuth, usePeriod } from '../lib/context';
import { EmployeeDnaReview } from '../components/DnaResults';
import { Education } from '../components/Education';
import { CompetencyEvidence } from '../components/CompetencyEvidence';
import { EmployeeAvatar } from '../components/EmployeeAvatar';
import { UserAccessDialog } from '../components/UserAccessDialog';
import { DnaHistory } from '../components/DnaHistory';
import { FilterBar } from '../components/FilterBar';
import { TransitionState } from '../components/TransitionState';
import { api, post, put, patch } from '../lib/api';
import {
  PageHeader,
  Panel,
  State,
  Empty,
  Button,
  Badge,
  Pagination,
  Form,
  Field,
  Tabs,
  Dialog,
  number,
  date,
  string,
  useFeedback,
} from '../components/ui';
import type { Employee, EmployeeInput } from '../../shared/contracts';
export function EmployeeList() {
  const { user } = useAuth();
  const { period } = usePeriod();
  const { run, confirm } = useFeedback();
  const canEdit = user?.role === 'ADMIN';
  const [search, setSearch] = useState(''),
    [q, setQ] = useState(''),
    [unit, setUnit] = useState(''),
    [status, setStatus] = useState('active'),
    [page, setPage] = useState(1);
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [search]);
  const query = new URLSearchParams({
      q,
      unit,
      status,
      year: String(period?.year || new Date().getFullYear()),
      page: String(page),
      limit: '8',
    }),
    state = useApi<{ rows: Employee[]; total: number; units: string[]; limit: number }>(
      `/employees?${query}`,
      { keepPreviousData: true },
    );
  const { data } = state;
  return (
    <>
      <PageHeader
        title="Daftar Pegawai"
        description="Kelola data dan perjalanan talenta pegawai BPS Kota Batu."
        actions={
          <>
            {canEdit && (
              <Link className="btn btn-secondary" to="/tim">
                <Users size={16} />
                Struktur Tim
              </Link>
            )}
            {canEdit && (
              <Link className="btn btn-primary" to="/pegawai/tambah">
                <Plus size={17} />
                Tambah Pegawai
              </Link>
            )}
          </>
        }
      />
      <Panel
        title="Data kepegawaian"
        description={
          status === 'inactive'
            ? 'Pegawai yang diarsipkan. Profil dan seluruh riwayat tetap tersimpan.'
            : 'Identitas dan unit kerja pegawai dalam satu tempat.'
        }
        actions={<Badge>{data?.total ?? '—'} pegawai</Badge>}
      >
        <FilterBar label="Filter daftar pegawai" className="employee-list-filters">
          <Field label="Pencarian">
            <div className="search-input">
              <Search size={17} />
              <input
                aria-label="Cari pegawai"
                placeholder="Cari nama, NIP, atau jabatan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Unit kerja">
            <select
              aria-label="Filter unit kerja"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua unit kerja</option>
              {data?.units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          {canEdit && (
            <Field label="Daftar pegawai">
              <select
                aria-label="Filter status pegawai"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="active">Daftar pegawai</option>
                <option value="inactive">Arsip pegawai</option>
              </select>
            </Field>
          )}
        </FilterBar>
        <TransitionState {...state} retry={state.refresh}>
          {data?.rows.length ? (
            <>
              <div className="employee-grid">
                {data.rows.map((e) => (
                  <article className="employee-card" key={e.id}>
                    <div className="employee-card-top">
                      <EmployeeAvatar size="card" employeeId={e.id} version={e.photo_version} />
                      {e.is_leader && <Badge tone="blue">Ketua Tim</Badge>}
                    </div>
                    <h3>
                      <Link to={`/pegawai/${e.id}`}>{e.name}</Link>
                    </h3>
                    <p className="mono employee-nip">{e.nip}</p>
                    <p>{e.position}</p>
                    <div className="employee-card-meta">
                      <Building2 size={16} />
                      <span>{e.unit}</span>
                      <span className="grade">{e.grade}</span>
                    </div>
                    <div className="employee-card-actions">
                      <Link className="text-link" to={`/pegawai/${e.id}`}>
                        Lihat profil <Eye size={16} aria-hidden="true" />
                      </Link>
                      {canEdit && (
                        <span className="employee-actions">
                          <Link
                            className="icon-link"
                            aria-label={`Edit ${e.name}`}
                            to={`/pegawai/${e.id}/edit`}
                          >
                            <Pencil size={16} />
                          </Link>
                          <Button
                            variant="ghost"
                            aria-label={`${e.active ? 'Arsipkan' : 'Pulihkan'} ${e.name}`}
                            title={e.active ? 'Arsipkan pegawai' : 'Pulihkan pegawai'}
                            onClick={async () => {
                              if (
                                e.active &&
                                !(await confirm({
                                  title: 'Arsipkan pegawai?',
                                  description: `${e.name} tidak lagi muncul di daftar utama dan tidak dapat login. Seluruh riwayat tetap tersimpan di arsip.`,
                                  label: 'Arsipkan',
                                }))
                              )
                                return;
                              void run(
                                async () => {
                                  if (e.active)
                                    await api(`/employees/${e.id}`, { method: 'DELETE' });
                                  else await post(`/employees/${e.id}/restore`);
                                  state.refresh();
                                },
                                e.active ? 'Pegawai diarsipkan.' : 'Pegawai dipulihkan.',
                              );
                            }}
                          >
                            {e.active ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                          </Button>
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <Pagination page={page} total={data.total} limit={data.limit} onPage={setPage} />
            </>
          ) : (
            <Empty
              title="Pegawai tidak ditemukan"
              description={
                q || unit
                  ? 'Coba ubah kata kunci atau filter.'
                  : 'Tambahkan data pegawai untuk memulai.'
              }
            />
          )}
        </TransitionState>
      </Panel>
      <p className="page-footnote">
        Data kepegawaian menjadi dasar penugasan tim dan penilaian tahunan.
      </p>
    </>
  );
}
export function EmployeeForm() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { notify } = useFeedback(),
    state = useApi(id ? `/employees/${id}` : null),
    employee = state.data?.employee as Employee | undefined;
  return (
    <>
      <Link to={id ? `/pegawai/${id}` : '/pegawai'} className="back-link">
        <ArrowLeft size={16} />
        Kembali {id ? 'ke detail' : 'ke daftar pegawai'}
      </Link>
      <PageHeader
        title={id ? 'Edit Pegawai' : 'Tambah Pegawai'}
        description="Pastikan identitas sesuai dengan data kepegawaian yang berlaku."
      />
      <State loading={state.loading} error={state.error} retry={state.refresh}>
        <Panel title="Identitas pegawai" className="form-panel">
          <Form
            key={employee?.id || 'new'}
            submit={id ? 'Simpan perubahan' : 'Tambah pegawai'}
            cancel={() => navigate(id ? `/pegawai/${id}` : '/pegawai')}
            onSubmit={async (d) => {
              const body: EmployeeInput = {
                nip: string(d, 'nip'),
                name: string(d, 'name'),
                position: string(d, 'position'),
                grade: string(d, 'grade'),
                unit: string(d, 'unit'),
                email: string(d, 'email'),
                phone: string(d, 'phone'),
                active: employee?.active ?? true,
              };
              const result = id
                ? await put(`/employees/${id}`, body)
                : await post('/employees', body);
              notify(id ? 'Data pegawai diperbarui.' : 'Pegawai berhasil ditambahkan.');
              navigate(`/pegawai/${id || result.id}`);
            }}
          >
            <div className="form-grid">
              <Field label="NIP" hint="18 angka, tanpa spasi.">
                <input
                  name="nip"
                  defaultValue={employee?.nip}
                  required
                  inputMode="numeric"
                  pattern="[0-9]{18}"
                  minLength={18}
                  maxLength={18}
                  placeholder="Contoh: 199001012020011001"
                />
              </Field>
              <Field label="Nama lengkap">
                <input
                  name="name"
                  defaultValue={employee?.name}
                  required
                  minLength={2}
                  maxLength={120}
                />
              </Field>
              <Field label="Jabatan">
                <input
                  name="position"
                  defaultValue={employee?.position}
                  required
                  maxLength={150}
                  placeholder="Statistisi Ahli Pertama"
                />
              </Field>
              <Field label="Golongan">
                <select name="grade" defaultValue={employee?.grade ?? ''}>
                  <option value="">Belum tersedia</option>
                  {employee?.grade && <option value={employee.grade}>{employee.grade}</option>}
                  {[
                    'I/a',
                    'I/b',
                    'I/c',
                    'I/d',
                    'II/a',
                    'II/b',
                    'II/c',
                    'II/d',
                    'III/a',
                    'III/b',
                    'III/c',
                    'III/d',
                    'IV/a',
                    'IV/b',
                    'IV/c',
                    'IV/d',
                    'IV/e',
                    'PPPK',
                    'III',
                    'V',
                    'VIII',
                    'IX',
                    'X',
                    'XI',
                  ].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unit kerja">
                <input
                  name="unit"
                  defaultValue={employee?.unit}
                  required
                  maxLength={100}
                  placeholder="Statistik Sosial"
                />
              </Field>
              <Field label="Email">
                <input name="email" type="email" defaultValue={employee?.email} maxLength={150} />
              </Field>
              <Field label="Nomor telepon">
                <input name="phone" type="tel" defaultValue={employee?.phone} maxLength={30} />
              </Field>
            </div>
          </Form>
        </Panel>
      </State>
    </>
  );
}
export function EmployeeDetail({
  self = false,
  initialTab = 'profil',
}: {
  self?: boolean;
  initialTab?: string;
}) {
  const params = useParams(),
    { user, refresh: refreshAuth } = useAuth(),
    { period } = usePeriod(),
    id = self ? user?.employee_id : params.id,
    state = useApi(id ? `/employees/${id}?year=${period?.year || new Date().getFullYear()}` : null),
    { data } = state;
  const [search, setSearch] = useSearchParams(),
    tab = self ? initialTab : search.get('tab') || initialTab,
    [credential, setCredential] = useState<any>(null),
    [editingProfile, setEditingProfile] = useState(false),
    [editingAccess, setEditingAccess] = useState(false),
    { run, confirm } = useFeedback();
  const employee = data?.employee as Employee | undefined,
    isManager = user?.role === 'ADMIN';
  const accounts = useApi(isManager && employee?.has_account ? '/users' : null);
  const account = accounts.data?.find((entry: { employee_id: string }) => entry.employee_id === id);
  const boxState = useApi<NineBoxResponse>(period ? `/nine-box/${period.id}` : null);
  const box = boxState.data?.rows.find((row) => row.employee_id === id);
  const ckp = data?.ckp.filter((r: any) => r.year === period?.year) || [];
  return (
    <>
      {!self && (
        <Link className="back-link" to="/pegawai">
          <ArrowLeft size={16} />
          Kembali ke daftar pegawai
        </Link>
      )}
      <PageHeader
        title={
          self
            ? initialTab === 'kompetensi'
              ? 'Kompetensi Saya'
              : 'Profil Saya'
            : 'Detail Pegawai'
        }
        description={
          self
            ? 'Identitas dan riwayat pengembangan Anda.'
            : 'Identitas dan riwayat pengembangan pegawai.'
        }
        actions={
          <>
            {isManager && employee?.has_account && (
              <Button
                variant="secondary"
                disabled={!account || account.id === user?.id}
                title={
                  account?.id === user?.id
                    ? 'Peran akun sendiri tidak dapat diubah.'
                    : 'Atur akses Pegawai, Supervisor, dan Admin'
                }
                onClick={() => setEditingAccess(true)}
              >
                <KeyRound size={16} />
                Kelola peran
              </Button>
            )}
            {isManager && employee && (
              <Link className="btn btn-secondary" to={`/pegawai/${id}/edit`}>
                <Pencil size={16} />
                Edit Pegawai
              </Link>
            )}
            {(self || isManager) && employee && employee.active && (
              <Button onClick={() => setEditingProfile(true)}>
                <Pencil size={16} />
                Edit profil & foto
              </Button>
            )}
          </>
        }
      />
      {editingAccess && account && (
        <UserAccessDialog
          editing={account}
          onClose={() => setEditingAccess(false)}
          onSaved={accounts.refresh}
        />
      )}
      <State {...state} retry={state.refresh}>
        {employee && (
          <>
            <Panel className="identity-panel">
              <div className="identity-main">
                <EmployeeAvatar
                  size="large"
                  employeeId={employee.id}
                  version={employee.photo_version}
                />
                <div>
                  <div className="inline">
                    {employee.is_leader && <Badge tone="blue">Ketua Tim</Badge>}
                    <span className="muted">{employee.grade}</span>
                  </div>
                  <h2>{employee.name}</h2>
                  <p>
                    {employee.position} <span className="separator">·</span> {employee.unit}
                  </p>
                  <small className="mono">NIP {employee.nip}</small>
                </div>
              </div>
              <div className="identity-meta">
                <span>
                  <Building2 size={15} />
                  {employee.unit}
                </span>
                {employee.email && (
                  <a href={`mailto:${employee.email}`}>
                    <Mail size={15} />
                    {employee.email}
                  </a>
                )}
                {employee.phone && (
                  <span>
                    <Phone size={15} />
                    {employee.phone}
                  </span>
                )}
              </div>
            </Panel>
            {!employee.active && (
              <Panel
                title="Profil dalam arsip"
                description="Riwayat tetap tersimpan. Pegawai tidak tampil di daftar utama dan tidak dapat login."
              >
                <p className="muted">Admin dapat memulihkan pegawai dari arsip.</p>
              </Panel>
            )}
            {!self && (
              <Tabs
                items={[
                  { id: 'profil', label: 'Profil' },
                  { id: 'potensi', label: 'Potensi' },
                  { id: 'kompetensi', label: 'Kompetensi' },
                  { id: 'ckp', label: 'Capaian Kinerja Pegawai' },
                  { id: 'riwayat', label: 'Riwayat Talenta' },
                ]}
                active={tab}
                onChange={(t) => setSearch({ tab: t })}
              />
            )}
            {tab === 'profil' && (
              <div className="two-col">
                <Panel title="Data kepegawaian">
                  <dl className="detail-list">
                    {[
                      ['NIP', employee.nip],
                      ['Jabatan', employee.position],
                      ['Golongan', employee.grade],
                      ['Unit kerja', employee.unit],
                      ['Email', employee.email || '—'],
                      ['Telepon', employee.phone || '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <h3 className="section-label">Riwayat penugasan tim</h3>
                  {data.teams.length ? (
                    <ul className="assignment-list">
                      {data.teams.map((t: any) => (
                        <li key={t.id}>
                          <Users size={17} />
                          <span>
                            <strong>{t.name}</strong>
                            <small>
                              {t.is_leader ? 'Ketua Tim' : 'Anggota'} · {t.year}
                            </small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Belum ada penugasan tim.</p>
                  )}
                </Panel>
                <Panel title="Ringkasan penilaian" description={`Tahun ${period?.year || '—'}`}>
                  <State {...boxState} retry={boxState.refresh}>
                    {box ? <BoxPosition row={box} /> : <Empty title="Posisi belum tersedia" />}
                  </State>
                </Panel>
              </div>
            )}
            {tab === 'profil' && (
              <Education key={employee.id + '/' + editingProfile} employee={employee} />
            )}
            {tab === 'potensi' && (
              <>
                {id && <DnaHistory key={id} employeeId={id} />}
                {period && id && <EmployeeDnaReview periodId={period.id} employeeId={id} />}
              </>
            )}
            {tab === 'kompetensi' && (
              <>
                {box && (
                  <Panel title="Rincian penilaian 9 box">
                    <ScoreBreakdown row={box} />
                  </Panel>
                )}
                <CompetencyEvidence
                  employee={employee}
                  period={period}
                  rows={data.evidence}
                  onSaved={() => {
                    state.refresh();
                    boxState.refresh();
                  }}
                />
              </>
            )}
            {tab === 'ckp' && (
              <Panel
                title={`Capaian Kinerja Pegawai ${period?.year || ''}`}
                description="Rata-rata CKP menyumbang 70% sumbu kinerja (Y)."
              >
                {ckp.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Bulan</th>
                          <th>Tahun</th>
                          <th>Nilai kinerja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ckp.map((s: any) => (
                          <tr key={s.month}>
                            <td>
                              {new Date(2026, s.month - 1).toLocaleString('id-ID', {
                                month: 'long',
                              })}
                            </td>
                            <td>{s.year}</td>
                            <td>{number(s.score)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty />
                )}
              </Panel>
            )}
            {tab === 'riwayat' && (
              <Panel
                title="Arsip pemetaan sebelumnya"
                description="Riwayat metode empat kuadran. Posisi saat ini menggunakan matriks 9 box pada periode yang dipilih."
              >
                {data.history.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Tahun</th>
                          <th>Potensi (X)</th>
                          <th>Kompetensi (Y)</th>
                          <th>Kuadran</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.history.map((s: any) => (
                          <tr key={s.period_id}>
                            <td>{s.year}</td>
                            <td>{number(s.potential)}</td>
                            <td>{number(s.competency)}</td>
                            <td>
                              <Badge tone={s.quadrant === 'Talenta Unggul' ? 'green' : 'blue'}>
                                {s.quadrant}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Peta talenta belum tersedia"
                    description="Pilih periode untuk melihat hasil matriks 9 box."
                  />
                )}
              </Panel>
            )}
            {id && <EmployeeFeedback employeeId={id} />}
            {isManager && (
              <div className="detail-admin-actions">
                {!employee.has_account && employee.active && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Buat akun pegawai?',
                          description:
                            'Kata sandi sementara akan ditampilkan satu kali. Berikan langsung kepada pegawai terkait.',
                        })
                      )
                        void run(async () => setCredential(await post(`/employees/${id}/account`)));
                    }}
                  >
                    <KeyRound size={16} />
                    Buat akun
                  </Button>
                )}
                {employee.active && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Arsipkan pegawai?',
                          description:
                            'Akses masuk pegawai akan dihentikan. Seluruh riwayat penilaian tetap tersimpan.',
                          label: 'Arsipkan',
                          danger: true,
                        })
                      )
                        void run(async () => {
                          await api(`/employees/${id}`, { method: 'DELETE' });
                          state.refresh();
                        }, 'Pegawai diarsipkan.');
                    }}
                  >
                    <Archive size={16} />
                    Arsipkan pegawai
                  </Button>
                )}
                {!employee.active && (
                  <Button
                    onClick={() =>
                      void run(async () => {
                        await post(`/employees/${id}/restore`);
                        state.refresh();
                      }, 'Pegawai dipulihkan.')
                    }
                  >
                    <ArchiveRestore size={16} />
                    Pulihkan dari arsip
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </State>
      {editingProfile && employee && (
        <ProfileEditor
          employee={employee}
          onClose={() => setEditingProfile(false)}
          onSaved={async () => {
            state.refresh();
            await refreshAuth();
          }}
        />
      )}
      {credential && (
        <Dialog title="Akun pegawai dibuat" onClose={() => setCredential(null)}>
          <p>
            NIP/akun: <strong>{credential.username}</strong>
          </p>
          <p>Kata sandi sementara:</p>
          <code className="credential">{credential.temporaryPassword}</code>
          <p className="muted">
            {credential.mustChangePassword
              ? 'Berikan langsung kepada pegawai. Kata sandi wajib diganti saat masuk pertama kali.'
              : 'Akun testing dapat langsung digunakan tanpa mengganti kata sandi.'}
          </p>
        </Dialog>
      )}
    </>
  );
}
function ProfileEditor({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { run, confirm } = useFeedback();
  return (
    <Dialog title="Edit profil & foto" onClose={onClose}>
      <div className="employee-photo-editor">
        <EmployeeAvatar size="large" employeeId={employee.id} version={employee.photo_version} />
        <span>Foto profil ditampilkan pada akun dan data pegawai.</span>
        {employee.photo_version && (
          <Button
            variant="ghost"
            onClick={async () => {
              if (
                await confirm({
                  title: 'Hapus foto profil?',
                  description: 'Ikon profil standar akan digunakan kembali.',
                  label: 'Hapus foto',
                })
              )
                void run(async () => {
                  await api(`/employees/${employee.id}/photo`, { method: 'DELETE' });
                  await onSaved();
                }, 'Foto dihapus.');
            }}
          >
            Hapus foto
          </Button>
        )}
      </div>
      <Form
        submit="Simpan foto"
        onSubmit={async (d) => {
          const file = d.get('file') as File;
          if (!file?.size) throw new Error('Pilih foto terlebih dahulu.');
          if (file.size > 2 * 1024 * 1024) throw new Error('Foto maksimal 2 MB.');
          const form = new FormData();
          form.append('file', file);
          await api(`/employees/${employee.id}/photo`, { method: 'POST', body: form });
          await onSaved();
        }}
      >
        <Field label="Foto profil" hint="JPEG atau PNG. Maksimal 2 MB dan 16 megapiksel.">
          <input type="file" name="file" accept="image/jpeg,image/png" required />
        </Field>
      </Form>
      <Form
        submit="Simpan profil"
        cancel={onClose}
        onSubmit={async (d) => {
          await patch(`/employees/${employee.id}/profile`, {
            name: string(d, 'name'),
            email: string(d, 'email'),
            phone: string(d, 'phone'),
          });
          await onSaved();
          onClose();
        }}
      >
        <Field label="Nama lengkap">
          <input name="name" defaultValue={employee.name} required minLength={2} maxLength={120} />
        </Field>
        <Field label="Email kontak" hint="Perubahan email kontak tidak mengubah ID login.">
          <input name="email" type="email" defaultValue={employee.email} maxLength={150} />
        </Field>
        <Field label="Nomor telepon">
          <input name="phone" type="tel" defaultValue={employee.phone} maxLength={30} />
        </Field>
        <p className="muted">
          NIP, jabatan, golongan, unit kerja, dan akses akun dikelola oleh Admin.
        </p>
      </Form>
      <Education employee={employee} editable />
    </Dialog>
  );
}
export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function EmployeeFeedback({ employeeId }: { employeeId: string }) {
  const { user } = useAuth(),
    state = useApi(`/employees/${employeeId}/feedback`);
  return (
    <Panel
      title="Feedback & pengembangan"
      description="Catatan supervisor bersifat opsional, dapat diberikan kapan saja, dan tidak mengubah nilai pegawai."
    >
      {(user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') && (
        <Form
          submit="Kirim feedback"
          onSubmit={async (d) => {
            await post(`/employees/${employeeId}/feedback`, { content: string(d, 'content') });
            state.refresh();
          }}
        >
          <Field label="Feedback untuk pegawai">
            <textarea
              name="content"
              required
              minLength={3}
              maxLength={4000}
              rows={4}
              placeholder="Tulis apresiasi, masukan, atau saran pengembangan…"
            />
          </Field>
        </Form>
      )}
      <State {...state} retry={state.refresh}>
        {state.data?.length ? (
          <div className="feedback-list">
            {state.data.map((f: any) => (
              <article className="feedback-card" key={f.id}>
                <strong>{f.author_name}</strong>
                <small>{date(f.created_at)}</small>
                <p>{f.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Belum ada feedback"
            description="Feedback dapat diberikan sewaktu-waktu tanpa jadwal wajib."
          />
        )}
      </State>
    </Panel>
  );
}
