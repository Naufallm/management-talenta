import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, ArrowLeft, Users } from 'lucide-react';
import { useApi, usePeriod } from '../lib/context';
import { post, put } from '../lib/api';
import {
  PageHeader,
  Panel,
  State,
  Empty,
  Button,
  Badge,
  Dialog,
  Form,
  Field,
  Tabs,
  date,
  string,
  useFeedback,
} from '../components/ui';
import { EmployeeSelect } from '../components/EmployeeSelect';
import type { Period, Question, ScoreConfig } from '../../shared/contracts';
export function Settings() {
  const { period, periods, refresh, loading, error } = usePeriod(),
    [tab, setTab] = useState('periods'),
    [editing, setEditing] = useState<Partial<Period> | null>(null),
    { notify } = useFeedback();
  return (
    <>
      <PageHeader
        title="Periode & Bank Soal"
        description="Atur siklus penilaian, instrumen, dan bobot perhitungan."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus size={16} />
            Tambah periode
          </Button>
        }
      />
      <Tabs
        items={[
          { id: 'periods', label: 'Periode' },
          { id: 'potential', label: 'Bank Soal Potensi' },
          { id: 'psych', label: 'Bank Soal Psikologi' },
          { id: 'config', label: 'Konfigurasi Skor' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'periods' && (
        <Panel
          title="Periode penilaian"
          description="Hanya satu periode yang dapat terbuka pada satu waktu."
        >
          <State loading={loading} error={error} retry={refresh}>
            {periods.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Tahun</th>
                      <th>Mulai</th>
                      <th>Selesai</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                        </td>
                        <td>{p.year}</td>
                        <td>{date(p.starts_on)}</td>
                        <td>{date(p.ends_on)}</td>
                        <td>
                          <Badge
                            tone={
                              p.status === 'OPEN'
                                ? 'green'
                                : p.status === 'DRAFT'
                                  ? 'orange'
                                  : 'neutral'
                            }
                          >
                            {p.status === 'OPEN'
                              ? 'Terbuka'
                              : p.status === 'DRAFT'
                                ? 'Draft'
                                : 'Ditutup'}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            aria-label={`Edit periode ${p.year}`}
                            onClick={() => setEditing(p)}
                          >
                            <Pencil size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
          </State>
        </Panel>
      )}
      {(tab === 'potential' || tab === 'psych') &&
        (period ? (
          <QuestionBank kind={tab} periodId={period.id} />
        ) : (
          <Empty title="Buat periode terlebih dahulu" />
        ))}
      {tab === 'config' &&
        (period ? (
          <Configuration periodId={period.id} />
        ) : (
          <Empty title="Buat periode terlebih dahulu" />
        ))}
      {editing && (
        <Dialog
          title={editing.id ? 'Edit periode' : 'Tambah periode'}
          onClose={() => setEditing(null)}
        >
          <Form
            cancel={() => setEditing(null)}
            onSubmit={async (d) => {
              const body = {
                name: string(d, 'name'),
                year: Number(d.get('year')),
                starts_on: string(d, 'starts_on'),
                ends_on: string(d, 'ends_on'),
                status: string(d, 'status'),
              };
              if (editing.id) await put(`/periods/${editing.id}`, body);
              else await post('/periods', body);
              setEditing(null);
              refresh();
              notify('Periode disimpan.');
            }}
          >
            <Field label="Nama periode">
              <input
                name="name"
                defaultValue={editing.name}
                required
                minLength={3}
                maxLength={120}
              />
            </Field>
            <Field label="Tahun">
              <input
                name="year"
                type="number"
                min="2020"
                max="2100"
                defaultValue={editing.year || 2027}
                readOnly={!!editing.id}
                required
              />
            </Field>
            <div className="form-grid">
              <Field label="Tanggal mulai">
                <input
                  name="starts_on"
                  type="date"
                  defaultValue={editing.starts_on?.slice(0, 10)}
                  required
                />
              </Field>
              <Field label="Tanggal selesai">
                <input
                  name="ends_on"
                  type="date"
                  defaultValue={editing.ends_on?.slice(0, 10)}
                  required
                />
              </Field>
            </div>
            <Field label="Status">
              <select name="status" defaultValue={editing.status || 'DRAFT'}>
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Terbuka</option>
                <option value="CLOSED">Ditutup</option>
              </select>
            </Field>
          </Form>
        </Dialog>
      )}
    </>
  );
}
function QuestionBank({ kind, periodId }: { kind: 'potential' | 'psych'; periodId: string }) {
  const state = useApi<Question[]>(`/periods/${periodId}/questions/${kind}`),
    [editing, setEditing] = useState<Partial<Question> | null>(null),
    { notify } = useFeedback();
  return (
    <Panel
      title={kind === 'psych' ? 'Bank soal psikologi' : 'Bank soal potensi'}
      description="Soal dapat diubah dan dinonaktifkan sebelum ada jawaban pada periode ini."
      actions={
        <Button onClick={() => setEditing({})}>
          <Plus size={16} />
          Tambah soal
        </Button>
      }
    >
      <State {...state} retry={state.refresh}>
        {state.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Urutan</th>
                  <th>Pertanyaan</th>
                  <th>Kategori</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((q) => (
                  <tr key={q.id}>
                    <td>{q.sort_order}</td>
                    <td className="question-cell">{q.text}</td>
                    <td>{q.category}</td>
                    <td>
                      <Badge tone={q.active ? 'green' : 'neutral'}>
                        {q.active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        aria-label={`Edit soal ${q.sort_order}`}
                        onClick={() => setEditing(q)}
                      >
                        <Pencil size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Belum ada soal" description="Tambahkan instrumen untuk periode terpilih." />
        )}
      </State>
      {kind === 'psych' && (
        <p className="page-footnote">
          Bank soal tersedia untuk pengelolaan instrumen. Perhitungan klinis tetap dinonaktifkan
          sampai validasi psikolog.
        </p>
      )}
      {editing && (
        <Dialog title={editing.id ? 'Edit soal' : 'Tambah soal'} onClose={() => setEditing(null)}>
          <Form
            cancel={() => setEditing(null)}
            onSubmit={async (d) => {
              const body = {
                text: string(d, 'text'),
                category: string(d, 'category'),
                sort_order: Number(d.get('sort_order')),
                active: d.get('active') === 'on',
              };
              if (editing.id)
                await put(`/periods/${periodId}/questions/${kind}/${editing.id}`, body);
              else await post(`/periods/${periodId}/questions/${kind}`, body);
              setEditing(null);
              state.refresh();
              notify('Soal disimpan.');
            }}
          >
            <Field label="Pertanyaan">
              <textarea
                name="text"
                required
                minLength={5}
                maxLength={2000}
                defaultValue={editing.text}
              />
            </Field>
            <div className="form-grid">
              <Field label="Kategori">
                <select
                  name="category"
                  defaultValue={editing.category || (kind === 'psych' ? 'REFLEKSI' : 'MANAJERIAL')}
                >
                  {kind === 'psych' ? (
                    <option value="REFLEKSI">Refleksi (belum tervalidasi)</option>
                  ) : (
                    <>
                      <option value="MANAJERIAL">Manajerial</option>
                      <option value="TEKNIS">Teknis</option>
                    </>
                  )}
                </select>
              </Field>
              <Field label="Urutan">
                <input
                  type="number"
                  name="sort_order"
                  min="1"
                  max="1000"
                  required
                  defaultValue={editing.sort_order || (state.data?.length || 0) + 1}
                />
              </Field>
            </div>
            <label className="checkbox-field">
              <input type="checkbox" name="active" defaultChecked={editing.active ?? true} />
              Soal aktif
            </label>
          </Form>
        </Dialog>
      )}
    </Panel>
  );
}
function Configuration({ periodId }: { periodId: string }) {
  const state = useApi<ScoreConfig>(`/periods/${periodId}/config`),
    { notify, confirm } = useFeedback();
  const groups = [
    [
      'Bobot potensi (%)',
      [
        ['managerial_weight', 'Manajerial'],
        ['technical_weight', 'Teknis'],
      ],
    ],
    [
      'Bobot kompetensi (%)',
      [
        ['evidence_weight', 'Bukti kegiatan'],
        ['leader_weight', 'Penilaian Ketua Tim'],
      ],
    ],
    [
      'Ambang kuadran (1–99)',
      [
        ['potential_threshold', 'Potensi (X)'],
        ['competency_threshold', 'Kompetensi (Y)'],
      ],
    ],
    [
      'Aturan bukti kegiatan',
      [
        ['training_hours_target', 'Target jam pelatihan untuk 100 poin'],
        ['achievement_points', 'Poin per penghargaan'],
      ],
    ],
  ] as const;
  return (
    <Panel
      title="Konfigurasi penilaian"
      description="Perubahan dihitung ulang pada semua skor periode ini. Konfigurasi memiliki nomor versi."
    >
      <State {...state} retry={state.refresh}>
        {state.data && (
          <Form
            key={`${periodId}/${state.data.version}`}
            submit="Simpan & hitung ulang"
            onSubmit={async (d) => {
              const fields = groups.flatMap((g) => g[1].map(([key]) => key));
              const body = {
                ...Object.fromEntries(fields.map((key) => [key, Number(d.get(key))])),
                employee_uploads: d.get('employee_uploads') === 'on',
              };
              if (
                !(await confirm({
                  title: 'Perbarui konfigurasi skor?',
                  description:
                    'Seluruh skor dan posisi talenta pada periode ini akan dihitung ulang menggunakan bobot baru.',
                  label: 'Simpan & hitung ulang',
                }))
              )
                return;
              await put(`/periods/${periodId}/config`, body);
              state.refresh();
              notify('Konfigurasi diperbarui dan skor dihitung ulang.');
            }}
          >
            <div className="config-version">
              <Badge tone="blue">Konfigurasi v{state.data.version}</Badge>
            </div>
            {groups.map(([title, fields]) => (
              <section className="config-section" key={title}>
                <h3>{title}</h3>
                <div className="form-grid">
                  {fields.map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        name={key}
                        type="number"
                        step="1"
                        min={key.includes('threshold') || key === 'training_hours_target' ? 1 : 0}
                        max={
                          key === 'training_hours_target'
                            ? 10000
                            : key.includes('threshold')
                              ? 99
                              : 100
                        }
                        defaultValue={(state.data as any)[key]}
                        required
                      />
                    </Field>
                  ))}
                </div>
              </section>
            ))}
            <input type="hidden" name="employee_uploads" value="on" />
            <p className="muted">
              Pegawai dapat mengunggah sertifikat sendiri untuk diverifikasi Admin.
            </p>
            <p className="muted">
              Normalisasi potensi: jawaban 1–5 → 0–100. Bukti kegiatan: jam terverifikasi / target ×
              100 + poin penghargaan, maksimum 100. Setiap pasangan bobot wajib berjumlah 100%.
            </p>
          </Form>
        )}
      </State>
    </Panel>
  );
}
export function Teams() {
  const { period } = usePeriod(),
    state = useApi(period ? `/teams?year=${period.year}` : null),
    [newTeam, setNewTeam] = useState(false),
    [assignment, setAssignment] = useState<any>(null),
    { notify, run, confirm } = useFeedback();
  return (
    <>
      <Link className="back-link" to="/pegawai">
        <ArrowLeft size={16} />
        Kembali ke pegawai
      </Link>
      <PageHeader
        title="Struktur Tim"
        description={`Penugasan anggota dan Ketua Tim · Tahun ${period?.year || '—'}`}
        actions={
          <Button onClick={() => setNewTeam(true)}>
            <Plus size={16} />
            Tambah tim
          </Button>
        }
      />
      <State {...state} retry={state.refresh}>
        {state.data?.teams.length ? (
          state.data.teams.map((t: any) => (
            <Panel
              key={t.id}
              title={t.name}
              actions={
                <Button variant="secondary" onClick={() => setAssignment(t)}>
                  <Users size={16} />
                  Atur anggota
                </Button>
              }
            >
              {state.data.members.filter((m: any) => m.team_id === t.id).length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Pegawai</th>
                        <th>Jabatan</th>
                        <th>Penugasan</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.members
                        .filter((m: any) => m.team_id === t.id)
                        .map((m: any) => (
                          <tr key={m.id}>
                            <td>
                              <Link className="person-link" to={`/pegawai/${m.employee_id}`}>
                                {m.name}
                              </Link>
                            </td>
                            <td>{m.position}</td>
                            <td>
                              <Badge tone={m.is_leader ? 'blue' : 'neutral'}>
                                {m.is_leader ? 'Ketua Tim' : 'Anggota'}
                              </Badge>
                            </td>
                            <td>
                              <Button
                                variant="ghost"
                                onClick={async () => {
                                  if (
                                    await confirm({
                                      title: 'Hapus penugasan?',
                                      description: `Hapus penugasan ${m.name} dari ${t.name}?`,
                                      danger: true,
                                      label: 'Hapus',
                                    })
                                  )
                                    void run(async () => {
                                      await put(`/teams/${t.id}/members`, {
                                        year: period!.year,
                                        employee_id: m.employee_id,
                                        is_leader: false,
                                        remove: true,
                                      });
                                      state.refresh();
                                    });
                                }}
                              >
                                Hapus penugasan
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="Belum ada anggota"
                  description="Tetapkan pegawai dan Ketua Tim untuk tahun ini."
                />
              )}
            </Panel>
          ))
        ) : (
          <Empty />
        )}
      </State>
      {newTeam && (
        <Dialog title="Tambah tim" onClose={() => setNewTeam(false)}>
          <Form
            cancel={() => setNewTeam(false)}
            onSubmit={async (d) => {
              await post('/teams', { name: string(d, 'name') });
              setNewTeam(false);
              state.refresh();
              notify('Tim ditambahkan.');
            }}
          >
            <Field label="Nama tim">
              <input name="name" required minLength={2} maxLength={100} />
            </Field>
          </Form>
        </Dialog>
      )}
      {assignment && (
        <Dialog title={`Penugasan · ${assignment.name}`} onClose={() => setAssignment(null)}>
          <Form
            cancel={() => setAssignment(null)}
            onSubmit={async (d) => {
              await put(`/teams/${assignment.id}/members`, {
                year: period!.year,
                employee_id: string(d, 'employee_id'),
                is_leader: d.get('is_leader') === 'on',
              });
              setAssignment(null);
              state.refresh();
              notify('Penugasan tim disimpan.');
            }}
          >
            <Field label="Pegawai">
              <EmployeeSelect />
            </Field>
            <label className="checkbox-field">
              <input type="checkbox" name="is_leader" />
              Tetapkan sebagai Ketua Tim
            </label>
            <p className="muted">
              Satu Ketua Tim per tahun. Penetapan Ketua Tim baru menggantikan penugasan ketua
              sebelumnya. Struktur tahun berjalan terkunci setelah ada penilaian Ketua Tim terkirim.
            </p>
          </Form>
        </Dialog>
      )}
    </>
  );
}
