import { useState } from 'react';
import { useApi, useAuth, usePeriod } from '../lib/context';
import { api, put, post, patch } from '../lib/api';
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
  Pagination,
  date,
  string,
  useFeedback,
} from '../components/ui';
import { roleLabel } from '../components/Layout';
import { EmployeeSelect } from '../components/EmployeeSelect';
import type { Question, Role } from '../../shared/contracts';
export function UsersPage() {
  const state = useApi('/users'),
    { user } = useAuth(),
    [editing, setEditing] = useState<any>(null),
    [password, setPassword] = useState(''),
    { notify, run, confirm } = useFeedback();
  return (
    <>
      <PageHeader
        title="Pengguna & Peran"
        description="Kelola hak akses dan pemulihan akun. Buat akun baru dari detail pegawai."
      />
      <Panel title="Akun pengguna">
        <State {...state} retry={state.refresh}>
          {state.data?.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pengguna / Akun</th>
                    <th>Peran</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.name || r.username}</strong>
                        <small className="mono">{r.username}</small>
                      </td>
                      <td>{roleLabel[r.role as Role]}</td>
                      <td>
                        <Badge tone={r.active ? 'green' : 'neutral'}>
                          {r.active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button
                            variant="ghost"
                            disabled={r.id === user?.id}
                            onClick={() => setEditing(r)}
                          >
                            Edit akses
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={r.id === user?.id}
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: 'Reset kata sandi?',
                                  description: `Semua sesi ${r.name || r.username} akan dihentikan. Kata sandi sementara ditampilkan satu kali.`,
                                  label: 'Reset kata sandi',
                                })
                              )
                                void run(async () => {
                                  const result = await post(`/users/${r.id}/reset-password`);
                                  setPassword(result.temporaryPassword);
                                  state.refresh();
                                });
                            }}
                          >
                            Reset kata sandi
                          </Button>
                        </div>
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
      {editing && (
        <Dialog
          title={`Akses · ${editing.name || editing.username}`}
          onClose={() => setEditing(null)}
        >
          <Form
            cancel={() => setEditing(null)}
            onSubmit={async (d) => {
              await patch(`/users/${editing.id}`, {
                role: string(d, 'role'),
                active: d.get('active') === 'on',
              });
              setEditing(null);
              state.refresh();
              notify('Hak akses diperbarui.');
            }}
          >
            <Field label="Peran">
              <select name="role" defaultValue={editing.role}>
                {Object.entries(roleLabel).map(([key, label]) => (
                  <option
                    key={key}
                    value={key}
                    disabled={key === 'PEGAWAI' && !editing.employee_id}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="checkbox-field">
              <input type="checkbox" name="active" defaultChecked={editing.active} />
              Akun aktif
            </label>
            <p className="muted">Perubahan akan menghentikan sesi aktif pengguna.</p>
          </Form>
        </Dialog>
      )}
      {password && (
        <Dialog title="Kata sandi sementara" onClose={() => setPassword('')}>
          <code className="credential">{password}</code>
          <p>
            Berikan langsung kepada pemilik akun. Pada mode testing, akun dapat langsung digunakan.
          </p>
        </Dialog>
      )}
    </>
  );
}
export function Audit() {
  const [page, setPage] = useState(1),
    state = useApi(`/audit-logs?page=${page}&limit=20`);
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Jejak aktivitas pengelolaan dan akses data sensitif."
      />
      <Panel title="Aktivitas sistem">
        <State {...state} retry={state.refresh}>
          {state.data?.rows.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Pengguna</th>
                      <th>Aktivitas</th>
                      <th>Resource</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.rows.map((r: any) => (
                      <tr key={r.id}>
                        <td>
                          {date(r.created_at)}
                          <small>
                            {new Date(r.created_at).toLocaleTimeString('id-ID', {
                              timeZone: 'Asia/Jakarta',
                            })}
                          </small>
                        </td>
                        <td>{r.username || 'Tanpa sesi'}</td>
                        <td>
                          <Badge>{r.action}</Badge>
                          {Object.keys(r.metadata).length > 0 && (
                            <details>
                              <summary>Rincian</summary>
                              <pre className="audit-metadata">
                                {JSON.stringify(r.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </td>
                        <td className="mono">{r.resource}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={state.data.total} limit={20} onPage={setPage} />
            </>
          ) : (
            <Empty />
          )}
        </State>
      </Panel>
    </>
  );
}
export function PsychologyResults() {
  const [editing, setEditing] = useState(false);
  const { run, confirm } = useFeedback();
  const [id, setId] = useState(''),
    { period } = usePeriod(),
    questions = useApi<Question[]>(period ? `/periods/${period.id}/questions/psych` : null),
    state = useApi(id && period ? `/assessments/psych/${period.id}/${id}` : null);
  return (
    <>
      <PageHeader
        title="Hasil Asesmen Psikologi"
        description="Akses terbatas Admin. Setiap pembacaan jawaban tercatat dalam audit log."
      />
      <Panel title="Pilih pegawai">
        <Field label="Pegawai">
          <EmployeeSelect value={id} onChange={setId} />
        </Field>
      </Panel>
      {id && (
        <Panel
          title="Jawaban dan hasil terbatas"
          actions={
            <>
              <Button onClick={() => setEditing(true)}>Kelola psikologi</Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (
                    await confirm({
                      title: 'Hapus data psikologi?',
                      description:
                        'Jawaban dan hasil pegawai pada periode ini akan dihapus. Tindakan dicatat dalam audit log.',
                      danger: true,
                      label: 'Hapus',
                    })
                  )
                    void run(async () => {
                      await api(`/psychology/${period?.id}/${id}`, { method: 'DELETE' });
                      state.refresh();
                    });
                }}
              >
                Hapus
              </Button>
            </>
          }
        >
          <State {...state} retry={state.refresh}>
            {state.data && (
              <>
                <div className="privacy-note">
                  <div>
                    <strong>{state.data.result.status}</strong>
                    <p>{state.data.result.message}</p>
                  </div>
                </div>
                <Badge tone={state.data.submitted_at ? 'green' : 'neutral'}>
                  {state.data.submitted_at ? 'Jawaban terkirim' : 'Belum dikirim'}
                </Badge>
                {Object.keys(state.data.answers).length ? (
                  <dl className="psych-answers">
                    {questions.data?.map((q) => (
                      <div key={q.id}>
                        <dt>{q.text}</dt>
                        <dd>{state.data.answers[q.id] ?? 'Belum dijawab'} / 5</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <Empty
                    title="Belum ada jawaban"
                    description="Tidak ada jawaban tersimpan untuk periode ini."
                  />
                )}
              </>
            )}
          </State>
        </Panel>
      )}
      {editing && id && period && (
        <Dialog title="Kelola data psikologi" onClose={() => setEditing(false)}>
          <Form
            cancel={() => setEditing(false)}
            onSubmit={async (d) => {
              const answers = Object.fromEntries(
                (questions.data || [])
                  .filter((q) => string(d, q.id) !== '')
                  .map((q) => [q.id, Number(d.get(q.id))]),
              );
              await put(`/psychology/${period.id}/${id}`, {
                answers,
                result: { status: string(d, 'status'), message: string(d, 'message') },
              });
              setEditing(false);
              state.refresh();
            }}
          >
            <p className="muted">
              Perubahan disimpan terenkripsi dan diaudit. Hasil diisi oleh Admin, tanpa skoring
              klinis otomatis.
            </p>
            {questions.data?.map((q) => (
              <Field label={q.text} key={q.id}>
                <select name={q.id} defaultValue={state.data?.answers[q.id] ?? ''}>
                  <option value="">Belum dijawab</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
            <Field label="Status hasil">
              <input
                name="status"
                required
                minLength={3}
                maxLength={100}
                defaultValue={state.data?.result.status}
              />
            </Field>
            <Field label="Catatan hasil">
              <textarea
                name="message"
                required
                minLength={3}
                maxLength={4000}
                rows={4}
                defaultValue={state.data?.result.message}
              />
            </Field>
          </Form>
        </Dialog>
      )}
    </>
  );
}
