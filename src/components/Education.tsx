import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useApi } from '../lib/context';
import { api, post, put } from '../lib/api';
import { Panel, State, Empty, Button, Field, Form, date, string, useFeedback } from './ui';
import type { Employee } from '../../shared/contracts';

export function Education({
  employee,
  editable = false,
}: {
  employee: Employee;
  editable?: boolean;
}) {
  const state = useApi(`/employees/${employee.id}/education`);
  const [editing, setEditing] = useState<any>(null);
  const { confirm, run } = useFeedback();
  return (
    <Panel
      title="Pendidikan formal"
      description="Riwayat jenjang pendidikan dan program studi."
      actions={
        editable &&
        !editing && (
          <Button variant="secondary" onClick={() => setEditing({})}>
            <Plus size={16} />
            Tambah pendidikan
          </Button>
        )
      }
    >
      <State {...state} retry={state.refresh}>
        {state.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    'No',
                    'NIP',
                    'Jenjang',
                    'Program studi',
                    'Tgl. ijazah',
                    'Tgl. update',
                    'Status data',
                    ...(editable ? ['Aksi'] : []),
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.data.map((r: any, i: number) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td className="mono">{employee.nip}</td>
                    <td>{r.level}</td>
                    <td>{r.study_program}</td>
                    <td>{date(r.diploma_date)}</td>
                    <td>{date(r.updated_at)}</td>
                    <td>Tersimpan</td>
                    {editable && (
                      <td>
                        <div className="row-actions">
                          <Button
                            variant="ghost"
                            aria-label={`Edit pendidikan ${r.level}`}
                            onClick={() => setEditing(r)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            aria-label={`Hapus pendidikan ${r.level}`}
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: 'Hapus pendidikan?',
                                  description: `${r.level} · ${r.study_program}`,
                                  label: 'Hapus',
                                  danger: true,
                                })
                              )
                                void run(async () => {
                                  await api(`/employees/${employee.id}/education/${r.id}`, {
                                    method: 'DELETE',
                                  });
                                  state.refresh();
                                  if (editing?.id === r.id) setEditing(null);
                                });
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Belum ada pendidikan formal"
            description={
              editable
                ? 'Tambahkan jenjang dan program studi yang pernah ditempuh.'
                : 'Riwayat dapat diisi melalui Edit profil.'
            }
          />
        )}
      </State>
      {editable && editing && (
        <div className="education-form" key={editing.id || 'new'}>
          <h3>{editing.id ? 'Edit pendidikan' : 'Tambah pendidikan'}</h3>
          <Form
            cancel={() => setEditing(null)}
            onSubmit={async (d) => {
              const body = {
                level: string(d, 'level'),
                study_program: string(d, 'study_program'),
                diploma_date: string(d, 'diploma_date'),
              };
              const path = `/employees/${employee.id}/education`;
              if (editing.id) await put(`${path}/${editing.id}`, body);
              else await post(path, body);
              setEditing(null);
              state.refresh();
            }}
          >
            <div className="form-grid">
              <Field label="Jenjang">
                <input
                  name="level"
                  list="education-levels"
                  defaultValue={editing.level || ''}
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="Contoh: DIV/S1"
                />
                <datalist id="education-levels">
                  {['SD/MI', 'SMP/MTs', 'SMA/MA/SMK', 'D1', 'D2', 'D3', 'DIV/S1', 'S2', 'S3'].map(
                    (v) => (
                      <option key={v} value={v} />
                    ),
                  )}
                </datalist>
              </Field>
              <Field label="Program studi">
                <input
                  name="study_program"
                  defaultValue={editing.study_program || ''}
                  required
                  minLength={2}
                  maxLength={200}
                />
              </Field>
              <Field label="Tanggal ijazah">
                <input
                  type="date"
                  name="diploma_date"
                  defaultValue={String(editing.diploma_date || '').slice(0, 10)}
                  required
                />
              </Field>
            </div>
            <p className="muted">
              NIP mengikuti profil pegawai. Tanggal update dicatat otomatis saat disimpan.
            </p>
          </Form>
        </div>
      )}
    </Panel>
  );
}
