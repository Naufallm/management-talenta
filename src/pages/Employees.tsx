import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  UserRound,
  Users,
  Mail,
  Phone,
  Building2,
  KeyRound,
  UserRoundX,
  Check,
} from 'lucide-react';
import { useApi, useAuth, usePeriod } from '../lib/context';
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
  const query = new URLSearchParams({ q, unit, status, page: String(page) }),
    state = useApi<{ rows: Employee[]; total: number; units: string[]; limit: number }>(
      `/employees?${query}`,
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
        description="Identitas, unit kerja, dan status kepegawaian dalam satu tempat."
        actions={<Badge>{data?.total ?? '—'} pegawai</Badge>}
      >
        <div className="toolbar">
          <label className="search-input">
            <Search size={17} />
            <input
              aria-label="Cari pegawai"
              placeholder="Cari nama, NIP, atau jabatan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
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
          <select
            aria-label="Filter status pegawai"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="active">Pegawai aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="all">Semua status</option>
          </select>
        </div>
        <State {...state} retry={state.refresh}>
          {data?.rows.length ? (
            <>
              <div className="employee-grid">
                {data.rows.map((e, i) => (
                  <article className="employee-card" key={e.id}>
                    <div className="employee-card-top">
                      <span className={`avatar avatar-${i % 4}`}>
                        {e.name
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')}
                      </span>
                      <Badge tone={e.active ? 'green' : 'neutral'}>
                        {e.active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
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
                        Lihat profil <ArrowUpRight size={16} />
                      </Link>
                      {canEdit && (
                        <Link
                          className="icon-link"
                          aria-label={`Edit ${e.name}`}
                          to={`/pegawai/${e.id}/edit`}
                        >
                          <Pencil size={16} />
                        </Link>
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
        </State>
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
                active: d.get('active') === 'on',
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
                <select name="grade" defaultValue={employee?.grade || 'III/a'}>
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
            <label className="checkbox-field">
              <input type="checkbox" name="active" defaultChecked={employee?.active ?? true} />
              Pegawai aktif
            </label>
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
    { user } = useAuth(),
    { period } = usePeriod(),
    id = self ? user?.employee_id : params.id,
    state = useApi(id ? `/employees/${id}` : null),
    { data } = state;
  const [search, setSearch] = useSearchParams(),
    tab = search.get('tab') || initialTab,
    [evidence, setEvidence] = useState(false),
    [credential, setCredential] = useState<any>(null),
    { run, confirm } = useFeedback();
  const employee = data?.employee as Employee | undefined,
    isManager = user?.role === 'ADMIN';

  const potential = data?.potential.find((r: any) => r.period_id === period?.id),
    competency = data?.competency.find((r: any) => r.period_id === period?.id),
    history = data?.history.find((r: any) => r.period_id === period?.id),
    ckp = data?.ckp.filter((r: any) => r.year === period?.year) || [];
  const ckpAverage = ckp.length
    ? ckp.reduce((s: number, r: any) => s + r.score, 0) / ckp.length
    : null;
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
          isManager &&
          employee && (
            <Link className="btn btn-secondary" to={`/pegawai/${id}/edit`}>
              <Pencil size={16} />
              Edit Pegawai
            </Link>
          )
        }
      />
      <State {...state} retry={state.refresh}>
        {employee && (
          <>
            <Panel className="identity-panel">
              <div className="identity-main">
                <div className="avatar large">
                  <UserRound size={30} />
                </div>
                <div>
                  <div className="inline">
                    <Badge tone={employee.active ? 'green' : 'neutral'}>
                      {employee.active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
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
            <Tabs
              items={[
                { id: 'profil', label: 'Profil' },
                { id: 'potensi', label: 'Potensi' },
                { id: 'kompetensi', label: 'Kompetensi' },
                { id: 'ckp', label: 'Kinerja CKP' },
                { id: 'riwayat', label: 'Riwayat Talenta' },
              ]}
              active={tab}
              onChange={(t) => setSearch({ tab: t })}
            />
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
                  <dl className="detail-list scores">
                    <div>
                      <dt>Potensi</dt>
                      <dd>
                        {number(potential?.score)}
                        <small>Sumber: asesmen manajerial & teknis</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Kompetensi</dt>
                      <dd>
                        {number(competency?.score)}
                        <small>Sumber: bukti terverifikasi & Ketua Tim</small>
                      </dd>
                    </div>
                    <div>
                      <dt>CKP rata-rata</dt>
                      <dd>
                        {number(ckpAverage)}
                        <small>{ckp.length} bulan tercatat</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Kuadran</dt>
                      <dd>{history?.quadrant || 'Belum tersedia'}</dd>
                    </div>
                  </dl>
                </Panel>
              </div>
            )}
            {tab === 'potensi' && (
              <Panel
                title="Riwayat skor potensi"
                description="Skala jawaban 1–5 dinormalisasi ke 0–100, kemudian dibobotkan per kategori."
              >
                {data.potential.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Tahun</th>
                          <th>Manajerial</th>
                          <th>Teknis</th>
                          <th>Skor akhir</th>
                          <th>Versi konfigurasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.potential.map((s: any) => (
                          <tr key={s.period_id}>
                            <td>{s.year}</td>
                            <td>{number(s.managerial)}</td>
                            <td>{number(s.technical)}</td>
                            <td>
                              <strong>{number(s.score)}</strong>
                            </td>
                            <td>v{s.config_version}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Belum ada skor potensi"
                    description="Skor tersedia setelah asesmen dikirim."
                  />
                )}
              </Panel>
            )}
            {tab === 'kompetensi' && (
              <>
                <div className="metric-grid three">
                  <Metric
                    label="Bukti kegiatan"
                    value={number(competency?.evidence)}
                    hint="Pelatihan & penghargaan terverifikasi"
                  />
                  <Metric
                    label="Penilaian Ketua Tim"
                    value={number(competency?.leader)}
                    hint="Rata-rata penilaian yang sudah dikirim"
                  />
                  <Metric
                    label="Skor kompetensi"
                    value={number(competency?.score)}
                    hint={
                      competency?.score == null
                        ? 'Menunggu komponen penilaian lengkap'
                        : 'Dihitung dengan bobot periode terpilih'
                    }
                  />
                </div>
                <Panel
                  title="Pelatihan & penghargaan"
                  description="Bukti yang terverifikasi berkontribusi terhadap skor kompetensi."
                  actions={
                    (isManager || user?.role === 'PEGAWAI') &&
                    period && (
                      <Button onClick={() => setEvidence(true)}>
                        <Plus size={16} />
                        Tambah sertifikat
                      </Button>
                    )
                  }
                >
                  {data.evidence.filter((r: any) => r.period_id === period?.id).length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Kegiatan</th>
                            <th>Tanggal</th>
                            <th>Jam</th>
                            <th>Status</th>
                            <th>Bukti / Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.evidence
                            .filter((r: any) => r.period_id === period?.id)
                            .map((r: any) => (
                              <tr key={r.id}>
                                <td>
                                  <strong>{r.name}</strong>
                                  <small>
                                    {r.kind === 'training' ? 'Pelatihan' : 'Penghargaan'} ·{' '}
                                    {r.organizer}
                                  </small>
                                </td>
                                <td>{date(r.activity_date)}</td>
                                <td>{number(r.hours)}</td>
                                <td>
                                  <Badge tone={r.verified ? 'green' : 'orange'}>
                                    {r.verified ? 'Terverifikasi' : 'Menunggu verifikasi'}
                                  </Badge>
                                </td>
                                <td>
                                  <div className="row-actions">
                                    {r.document_id && (
                                      <a
                                        className="text-link"
                                        href={`/api/documents/${r.document_id}`}
                                      >
                                        Unduh
                                      </a>
                                    )}
                                    {isManager && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          title={
                                            r.verified ? 'Batalkan verifikasi' : 'Verifikasi bukti'
                                          }
                                          onClick={() =>
                                            void run(async () => {
                                              await patch(`/evidence/${r.kind}/${r.id}/verify`, {
                                                verified: !r.verified,
                                              });
                                              state.refresh();
                                            })
                                          }
                                        >
                                          <Check size={16} />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          onClick={async () => {
                                            if (
                                              await confirm({
                                                title: 'Hapus kegiatan?',
                                                description:
                                                  'Bukti kegiatan akan dihapus dan skor kompetensi dihitung ulang.',
                                                danger: true,
                                                label: 'Hapus',
                                              })
                                            )
                                              void run(async () => {
                                                await api(`/evidence/${r.kind}/${r.id}`, {
                                                  method: 'DELETE',
                                                });
                                                state.refresh();
                                              });
                                          }}
                                        >
                                          Hapus
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      title="Belum ada kegiatan pada periode ini"
                      description="Admin mengelola dan memverifikasi bukti pelatihan serta penghargaan."
                    />
                  )}
                </Panel>
              </>
            )}
            {tab === 'ckp' && (
              <Panel
                title={`Kinerja CKP ${period?.year || ''}`}
                description="Penilaian CKP dicatat terpisah dari sumbu peta talenta."
              >
                {ckp.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Bulan</th>
                          <th>Tahun</th>
                          <th>Skor CKP</th>
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
              <Panel title="Riwayat peta talenta">
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
                    description="Potensi dan kompetensi harus lengkap untuk menentukan kuadran."
                  />
                )}
              </Panel>
            )}
            {id && <EmployeeFeedback employeeId={id} />}
            {isManager && (
              <div className="detail-admin-actions">
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
                {employee.active && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Nonaktifkan pegawai?',
                          description:
                            'Akses masuk pegawai akan dihentikan. Seluruh riwayat penilaian tetap tersimpan.',
                          label: 'Nonaktifkan',
                          danger: true,
                        })
                      )
                        void run(async () => {
                          await api(`/employees/${id}`, { method: 'DELETE' });
                          state.refresh();
                        }, 'Pegawai dinonaktifkan.');
                    }}
                  >
                    <UserRoundX size={16} />
                    Nonaktifkan pegawai
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </State>
      {evidence && id && period && (
        <EvidenceDialog
          employeeId={id}
          periodId={period.id}
          year={period.year}
          isManager={isManager}
          onClose={() => setEvidence(false)}
          onSave={() => {
            setEvidence(false);
            state.refresh();
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
            Berikan langsung kepada pegawai. Kata sandi wajib diganti saat masuk pertama kali.
          </p>
        </Dialog>
      )}
    </>
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
function EvidenceDialog({
  employeeId,
  periodId,
  year,
  isManager,
  onClose,
  onSave,
}: {
  employeeId: string;
  periodId: string;
  year: number;
  isManager: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog title="Tambah sertifikat" onClose={onClose}>
      <Form
        submit="Simpan kegiatan"
        cancel={onClose}
        onSubmit={async (d) => {
          let documentId = null;
          const file = d.get('file') as File;
          if (file?.size) {
            const form = new FormData();
            form.append('file', file);
            form.append('employee_id', employeeId);
            form.append('period_id', periodId);
            const result = await api('/documents', { method: 'POST', body: form });
            documentId = result.id;
          }
          await post(`/evidence/${periodId}`, {
            employee_id: employeeId,
            kind: string(d, 'kind'),
            name: string(d, 'name'),
            activity_type: string(d, 'activity_type'),
            activity_date: string(d, 'activity_date'),
            organizer: string(d, 'organizer'),
            hours: Number(d.get('hours')),
            document_id: documentId,
            verified: d.get('verified') === 'on',
          });
          onSave();
        }}
      >
        <div className="form-grid">
          <Field label="Jenis kegiatan">
            <select name="kind">
              <option value="training">Pelatihan</option>
              <option value="achievement">Penghargaan</option>
            </select>
          </Field>
          <Field label="Kategori">
            <input name="activity_type" placeholder="Contoh: Teknis" required minLength={2} />
          </Field>
        </div>
        <Field label="Nama kegiatan">
          <input name="name" required minLength={3} maxLength={200} />
        </Field>
        <Field label="Penyelenggara">
          <input name="organizer" required minLength={2} />
        </Field>
        <div className="form-grid">
          <Field label="Tanggal">
            <input
              type="date"
              name="activity_date"
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              required
            />
          </Field>
          <Field label="Jumlah jam">
            <input
              type="number"
              name="hours"
              min="0"
              max="10000"
              step="0.5"
              defaultValue="0"
              required
            />
          </Field>
        </div>
        <Field label="Sertifikat / dokumen bukti" hint="PDF, PNG, atau JPEG. Maksimum 2 MB.">
          <input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" />
        </Field>
        {isManager && (
          <label className="checkbox-field">
            <input type="checkbox" name="verified" />
            Tandai sebagai terverifikasi
          </label>
        )}
      </Form>
    </Dialog>
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
