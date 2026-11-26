import { EvidenceFile } from './EvidenceFile';
import { suggestTrainingMatch } from '../../shared/training-match';
import { AwardClassificationDialog } from './NineBoxForms';
import { useState } from 'react';
import { Plus, Check, Trash2, Undo2 } from 'lucide-react';
import { useAuth } from '../lib/context';
import { api, post, patch } from '../lib/api';
import {
  Panel,
  Empty,
  Button,
  Badge,
  Dialog,
  Form,
  Field,
  date,
  number,
  string,
  useFeedback,
} from './ui';
import type { Employee, Period } from '../../shared/contracts';

function MatchOptions({ pending }: { pending: string }) {
  return (
    <>
      <option value="">{pending}</option>
      <option value="true">Sesuai · 10 poin</option>
      <option value="false">Tidak sesuai · 0 poin</option>
    </>
  );
}
type Kind = 'training' | 'achievement';
export function CompetencyEvidence({
  employee,
  period,
  rows,
  onSaved,
  only,
}: {
  only?: Kind;
  employee: Employee;
  period?: Period;
  rows: any[];
  onSaved: () => void;
}) {
  const { user } = useAuth(),
    { run, confirm, notify } = useFeedback();
  const [adding, setAdding] = useState<Kind | null>(null);
  const [attachment, setAttachment] = useState<{ id: string; kind: Kind } | null>(null);
  const [classifying, setClassifying] = useState<any>(null);
  const admin = user?.role === 'ADMIN';
  const writable =
    employee.active && period?.status === 'OPEN' && (admin || user?.role === 'PEGAWAI');
  return (
    <>
      {(only ? [only] : (['training', 'achievement'] as Kind[])).map((kind) => {
        const training = kind === 'training';
        const entries = rows.filter((r) => r.period_id === period?.id && r.kind === kind);
        const ready = training
          ? entries.filter(
              (r) =>
                !r.verified &&
                r.document_id &&
                (r.job_match ?? suggestTrainingMatch(employee.position, r.name)) != null,
            )
          : [];
        return (
          <Panel
            key={kind}
            title={training ? 'Kursus / pelatihan / diklat' : 'Penghargaan'}
            description={`Tahun ${period?.year || '—'} · ${training ? 'Jam terverifikasi menyumbang 30% sumbu potensial.' : 'Penghargaan terverifikasi menyumbang maksimal 15% sumbu kinerja.'}`}
            actions={
              writable && (
                <div className="row-actions">
                  {admin && ready.length > 0 && (
                    <Button
                      variant="primary"
                      onClick={() =>
                        void run(async () => {
                          const result = await post(
                            '/evidence/' + period!.id + '/training/' + employee.id + '/verify-all',
                            {
                              ids: ready.map((r) => r.id),
                            },
                          );
                          notify(result.count + ' pelatihan berhasil diverifikasi.');
                          onSaved();
                        })
                      }
                    >
                      <Check size={16} /> Verifikasi semua ({ready.length})
                    </Button>
                  )}
                  <Button variant={admin && ready.length ? 'secondary' : 'primary'} onClick={() => setAdding(kind)}>
                    <Plus size={16} />
                    {training ? 'Tambah pelatihan' : 'Tambah penghargaan'}
                  </Button>
                </div>
              )
            }
          >
            {entries.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        training ? 'Nama diklat' : 'Nama penghargaan',
                        training ? 'Tgl. mulai' : 'Tahun',
                        training ? 'Tempat' : 'Instansi',
                        ...(training
                          ? ['Jam pelatihan', 'Sesuai pekerjaan?']
                          : ['Tingkat / cakupan']),
                        'Bukti',
                        'Status data',
                        ...(writable && admin ? ['Aksi'] : []),
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((r) => {
                      const suggestion = training
                        ? suggestTrainingMatch(employee.position, r.name)
                        : null;
                      return (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.name}</strong>
                            <small>
                              {r.activity_type}
                              {training && ` · ${r.organizer}`}
                            </small>
                          </td>
                          <td>
                            {training ? date(r.activity_date) : String(r.activity_date).slice(0, 4)}
                          </td>
                          <td>{training ? r.place || '—' : r.organizer}</td>
                          {training && <td className="nowrap">{number(r.hours)} jam</td>}
                          {training && (
                            <td>
                              {r.job_match == null && (
                                <small>
                                  {suggestion == null
                                    ? 'Perlu tinjauan'
                                    : suggestion
                                      ? 'Saran: sesuai'
                                      : 'Saran: tidak sesuai'}
                                </small>
                              )}
                              {writable && admin ? (
                                <select
                                  aria-label={'Kesesuaian pekerjaan untuk ' + r.name}
                                  value={r.job_match == null ? '' : String(r.job_match)}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    void run(async () => {
                                      await patch('/evidence/training/' + r.id + '/relevance', {
                                        job_match: value === '' ? null : value === 'true',
                                      });
                                      onSaved();
                                    });
                                  }}
                                >
                                  <MatchOptions
                                    pending={
                                      suggestion == null
                                        ? 'Pilih penilaian'
                                        : r.verified
                                          ? 'Konfirmasi saran'
                                          : 'Gunakan saran'
                                    }
                                  />
                                </select>
                              ) : r.job_match == null ? (
                                'Belum dinilai'
                              ) : r.job_match ? (
                                'Sesuai · 10 poin'
                              ) : (
                                'Tidak sesuai · 0 poin'
                              )}
                            </td>
                          )}
                          {!training && (
                            <td>
                              {r.award_level
                                ? (
                                    {
                                      CITY: 'Kabupaten / kota',
                                      PROVINCE: 'Provinsi',
                                      NATIONAL: 'Nasional',
                                    } as Record<string, string>
                                  )[r.award_level]
                                : 'Belum diklasifikasi'}
                              <small>
                                {r.award_scope === 'INTERNAL'
                                  ? 'Internal BPS'
                                  : r.award_scope === 'EXTERNAL'
                                    ? 'Eksternal BPS'
                                    : ''}
                              </small>
                              {admin && writable && (
                                <Button variant="ghost" onClick={() => setClassifying(r)}>
                                  Klasifikasi
                                </Button>
                              )}
                            </td>
                          )}
                          <td>
                            <EvidenceFile id={r.document_id} />
                            {!r.document_id && writable && (!r.verified || admin) && (
                              <Button
                                variant="ghost"
                                onClick={() => setAttachment({ id: r.id, kind })}
                              >
                                Lampirkan bukti
                              </Button>
                            )}
                          </td>
                          <td>
                            <Badge tone={r.verified ? 'green' : 'orange'}>
                              {r.verified ? 'Terverifikasi' : 'Menunggu verifikasi'}
                            </Badge>
                          </td>
                          {writable && admin && (
                            <td>
                              <div className="row-actions">
                                {admin && writable && (
                                  <>
                                    <Button
                                      variant={r.verified ? 'ghost' : 'primary'}
                                      aria-label={`${r.verified ? 'Batalkan verifikasi' : 'Verifikasi'} ${r.name}`}
                                      disabled={
                                        !r.verified &&
                                        (!r.document_id ||
                                          (training && r.job_match == null && suggestion == null))
                                      }
                                      onClick={() =>
                                        void run(async () => {
                                          await patch(`/evidence/${kind}/${r.id}/verify`, {
                                            verified: !r.verified,
                                          });
                                          onSaved();
                                        })
                                      }
                                    >
                                      {r.verified ? <Undo2 size={16} /> : <Check size={16} />}{' '}
                                      {r.verified ? 'Batalkan verifikasi' : 'Verifikasi'}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      aria-label={`Hapus ${r.name}`}
                                      onClick={async () => {
                                        if (
                                          await confirm({
                                            title: 'Hapus kegiatan?',
                                            description:
                                              'Bukti dihapus dan skor kompetensi dihitung ulang.',
                                            label: 'Hapus',
                                            danger: true,
                                          })
                                        )
                                          void run(async () => {
                                            await api(`/evidence/${kind}/${r.id}`, {
                                              method: 'DELETE',
                                            });
                                            onSaved();
                                          });
                                      }}
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title={
                  training
                    ? 'Belum ada pelatihan pada periode ini'
                    : 'Belum ada penghargaan pada periode ini'
                }
                description={
                  period?.status === 'CLOSED'
                    ? 'Periode ini ditutup. Riwayat tetap dapat dilihat.'
                    : 'Tambahkan kegiatan beserta dokumen buktinya.'
                }
              />
            )}
          </Panel>
        );
      })}
      {attachment && period && (
        <Dialog title="Lampirkan bukti kegiatan" onClose={() => setAttachment(null)}>
          <Form
            cancel={() => setAttachment(null)}
            onSubmit={async (form) => {
              form.set('employee_id', employee.id);
              form.set('period_id', period.id);
              form.set('evidence_id', attachment.id);
              form.set('kind', attachment.kind);
              await api('/documents', { method: 'POST', body: form });
              setAttachment(null);
              onSaved();
            }}
          >
            <Field label="Dokumen bukti" hint="PDF, PNG, atau JPEG. Maksimal 2 MB.">
              <input type="file" name="file" required accept=".pdf,.png,.jpg,.jpeg" />
            </Field>
          </Form>
        </Dialog>
      )}
      {classifying && period && (
        <AwardClassificationDialog
          periodId={period.id}
          award={classifying}
          onClose={() => setClassifying(null)}
          onSaved={onSaved}
        />
      )}
      {adding && period && (
        <EvidenceDialog
          kind={adding}
          position={employee.position}
          employeeId={employee.id}
          period={period}
          admin={admin}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            onSaved();
          }}
        />
      )}
    </>
  );
}

function EvidenceDialog({
  position,
  kind,
  employeeId,
  period,
  admin,
  onClose,
  onSaved,
}: {
  kind: Kind;
  position: string;
  employeeId: string;
  period: Period;
  admin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const training = kind === 'training';
  const [title, setTitle] = useState('');
  const suggestion = suggestTrainingMatch(position, title);
  return (
    <Dialog title={training ? 'Tambah pelatihan / diklat' : 'Tambah penghargaan'} onClose={onClose}>
      <Form
        cancel={onClose}
        onSubmit={async (d) => {
          let documentId = null;
          const file = d.get('file') as File;
          if (file?.size) {
            const form = new FormData();
            form.append('file', file);
            form.append('employee_id', employeeId);
            form.append('period_id', period.id);
            documentId = (await api('/documents', { method: 'POST', body: form })).id;
          }
          await post(`/evidence/${period.id}`, {
            employee_id: employeeId,
            kind,
            job_match:
              training && string(d, 'job_match') !== '' ? string(d, 'job_match') === 'true' : null,
            award_level: training ? null : string(d, 'award_level') || null,
            award_scope: training ? null : string(d, 'award_scope') || null,
            name: string(d, 'name'),
            activity_type: string(d, 'activity_type'),
            activity_date: training ? string(d, 'activity_date') : `${string(d, 'year')}-01-01`,
            organizer: string(d, 'organizer'),
            place: training ? string(d, 'place') : '',
            hours: training ? Number(d.get('hours')) : 0,
            document_id: documentId,
            verified: d.get('verified') === 'on',
          });
          onSaved();
        }}
      >
        <Field label={training ? 'Nama diklat / pelatihan' : 'Nama penghargaan'}>
          <input
            name="name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={200}
          />
        </Field>
        <div className="form-grid">
          <Field label="Kategori">
            <input
              name="activity_type"
              required
              minLength={2}
              maxLength={100}
              placeholder={training ? 'Contoh: Teknis' : 'Contoh: Prestasi kerja'}
            />
          </Field>
          <Field label={training ? 'Penyelenggara' : 'Instansi pemberi'}>
            <input name="organizer" required minLength={2} maxLength={150} />
          </Field>
          {training ? (
            <>
              <Field label="Tanggal mulai">
                <input
                  type="date"
                  name="activity_date"
                  min={`${period.year}-01-01`}
                  max={`${period.year}-12-31`}
                  required
                />
              </Field>
              <Field label="Tempat">
                <input name="place" required maxLength={200} placeholder="Kota / lokasi / daring" />
              </Field>
              {training && (
                <div aria-live="polite">
                  <strong>Kesesuaian dengan pekerjaan</strong>
                  <p>
                    {!title.trim()
                      ? 'Isi nama pelatihan untuk melihat saran.'
                      : suggestion == null
                        ? 'Perlu tinjauan Admin.'
                        : suggestion
                          ? 'Saran: sesuai dengan pekerjaan.'
                          : 'Saran: tidak sesuai dengan pekerjaan.'}
                  </p>
                  {admin && (
                    <Field label="Koreksi saran">
                      <select name="job_match" defaultValue="">
                        <option value="">Gunakan saran</option>
                        <option value="true">Sesuai</option>
                        <option value="false">Tidak sesuai</option>
                      </select>
                    </Field>
                  )}
                </div>
              )}
              <Field label="Jam pelatihan" hint="Durasi dalam satuan jam.">
                <input type="number" name="hours" min="0" max="10000" step="0.5" required />
              </Field>
            </>
          ) : (
            <Field label="Tahun penghargaan">
              <input
                type="number"
                name="year"
                min={period.year}
                max={period.year}
                defaultValue={period.year}
                required
              />
            </Field>
          )}
        </div>
        {!training && (
          <div className="form-grid">
            <Field label="Tingkat penghargaan">
              <select name="award_level" required>
                <option value="">Pilih tingkat</option>
                <option value="CITY">Kabupaten / kota</option>
                <option value="PROVINCE">Provinsi</option>
                <option value="NATIONAL">Nasional</option>
              </select>
            </Field>
            <Field label="Cakupan">
              <select name="award_scope" required>
                <option value="">Pilih cakupan</option>
                <option value="INTERNAL">Internal BPS</option>
                <option value="EXTERNAL">Eksternal BPS</option>
              </select>
            </Field>
          </div>
        )}
        <Field label="Sertifikat / dokumen bukti" hint="PDF, PNG, atau JPEG. Maksimal 2 MB.">
          <input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" />
        </Field>
        {admin && (
          <label className="checkbox-field">
            <input type="checkbox" name="verified" />
            Tandai sebagai terverifikasi
          </label>
        )}
        <p className="muted">
          Tanggal update dicatat otomatis. Status verifikasi ditentukan oleh Admin.
        </p>
      </Form>
    </Dialog>
  );
}
