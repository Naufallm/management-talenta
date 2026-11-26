import { useId } from 'react';
import { useApi, usePeriod } from '../lib/context';
import { put, patch } from '../lib/api';
import { State, Field, Form, Dialog, Panel, string, number, useFeedback } from './ui';
import {
  educationLevels,
  normalizeEducation,
  weights,
  awardLevels,
  awardPoints,
  type NineBoxConfig,
  type NineBoxRow,
} from '../../shared/nine-box';
import './NineBox.css';
function AxisThresholds({ axis, config }: { axis: 'x' | 'y'; config: NineBoxConfig }) {
  return (
    <div className="form-grid">
      {(['medium', 'high'] as const).map((level) => {
        const key = `${axis}_${level}_from` as const;
        return (
          <Field
            key={key}
            label={level === 'medium' ? 'Batas kategori sedang' : 'Batas kategori tinggi'}
          >
            <input
              name={key}
              type="number"
              min="1"
              max="100"
              step="0.01"
              defaultValue={config[key]}
              required
            />
          </Field>
        );
      })}
    </div>
  );
}
export function NineBoxConfigEditor({
  onSaved,
  onClose,
}: {
  onSaved?: () => void;
  onClose?: () => void;
}) {
  const { period } = usePeriod();
  const state = useApi<{ config: NineBoxConfig; version: number }>(
    period ? `/nine-box/${period.id}/config` : null,
  );
  const { notify } = useFeedback();
  const config = state.data?.config;
  const xTitle = useId();
  const yTitle = useId();
  return (
    <State {...state} retry={state.refresh}>
      {state.data && config && (
        <>
          <p className="nine-table-note">
            Bobot mengikuti rancangan penilaian: sumbu X dan Y masing-masing berjumlah 100%.
            Sesuaikan batas kategori, jam pelatihan, dan skor pendidikan dengan acuan instansi.
          </p>
          <Form
            key={state.data.version}
            disabled={period?.status !== 'OPEN'}
            cancel={onClose}
            onSubmit={async (d) => {
              await put(`/nine-box/${period!.id}/config`, {
                x_medium_from: Number(d.get('x_medium_from')),
                x_high_from: Number(d.get('x_high_from')),
                y_medium_from: Number(d.get('y_medium_from')),
                y_high_from: Number(d.get('y_high_from')),
                training_hours_target: Number(d.get('training_hours_target')),
                award_mode: string(d, 'award_mode'),
                assessment_source: string(d, 'assessment_source'),
                education_scores: Object.fromEntries(
                  educationLevels.map((level) => [level, Number(d.get('education_' + level))]),
                ),
              });
              state.refresh();
              notify('Konfigurasi 9 box disimpan.');
              onSaved?.();
            }}
          >
            <div className="nine-config-axes">
              <section className="nine-config-axis" aria-labelledby={xTitle}>
                <h3 id={xTitle}>Sumbu X · Potensial</h3>
                <AxisThresholds axis="x" config={config} />
                <div className="nine-config-group">
                  <h4>
                    Kompetensi <span>{weights.training + weights.experience}%</span>
                  </h4>
                  <p>
                    <strong>Pengembangan kompetensi / pelatihan · {weights.training}%</strong>
                  </p>
                  <Field
                    label="Target jam pelatihan per tahun"
                    hint="Jam terverifikasi dibagi target, hingga 100%."
                  >
                    <input
                      name="training_hours_target"
                      type="number"
                      min="0.5"
                      max="10000"
                      step="0.5"
                      defaultValue={config.training_hours_target}
                      required
                    />
                  </Field>
                  <p>
                    <strong>Pengalaman jabatan · {weights.experience}%</strong>
                  </p>
                  <p>
                    Ketua tim 20 poin, anggota 5 poin. Gunakan poin peran tertinggi dari tim pada
                    tahun penilaian.
                  </p>
                </div>
                <div className="nine-config-group">
                  <h4>
                    Potensi <span>{weights.assessment}%</span>
                  </h4>
                  <Field label="Sumber nilai asesmen potensi">
                    <select name="assessment_source" defaultValue={config.assessment_source}>
                      <option value="DNA">Rata-rata 30 jawaban DNA (0–100)</option>
                      <option value="ADMIN">Hasil asesmen diinput Admin (0–100)</option>
                    </select>
                  </Field>
                </div>
                <div className="nine-config-group">
                  <h4>
                    Kualifikasi <span>{weights.education + weights.field_match}%</span>
                  </h4>
                  <p>
                    <strong>Pendidikan formal · {weights.education}%</strong>
                  </p>
                  <p>Admin mengonfirmasi jenjang. Atur skor setiap jenjang pada skala 0–100.</p>
                  <div className="nine-education-scores">
                    {educationLevels.map((level) => (
                      <Field key={level} label={level}>
                        <input
                          name={'education_' + level}
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          required
                          defaultValue={config.education_scores[level]}
                        />
                      </Field>
                    ))}
                  </div>
                  <p>
                    <strong>Kesesuaian bidang ilmu · {weights.field_match}%</strong>
                  </p>
                  <p>
                    Nilai kesesuaian setiap pelatihan dengan pekerjaan yang digeluti. Sesuai 10
                    poin, tidak sesuai 0 poin. Rata-rata poin pelatihan terverifikasi menentukan
                    nilai komponen ini.
                  </p>
                </div>
              </section>
              <section className="nine-config-axis" aria-labelledby={yTitle}>
                <h3 id={yTitle}>Sumbu Y · Kinerja</h3>
                <AxisThresholds axis="y" config={config} />
                <div className="nine-config-group">
                  <h4>
                    Kinerja utama <span>{weights.ckp}%</span>
                  </h4>
                  <p>
                    Rata-rata nilai CKP yang tercatat pada tahun penilaian. Untuk tahun berjalan,
                    perhitungan mencakup hingga bulan ini.
                  </p>
                </div>
                <div className="nine-config-group">
                  <h4>
                    Kinerja penguat <span>{weights.awards + weights.leader}%</span>
                  </h4>
                  <p>
                    <strong>Penghargaan · {weights.awards}%</strong>
                  </p>
                  <div className="table-wrap">
                    <table className="nine-award-points">
                      <caption>Poin penghargaan terverifikasi</caption>
                      <thead>
                        <tr>
                          <th scope="col">Tingkat</th>
                          <th scope="col">Internal BPS</th>
                          <th scope="col">Eksternal BPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {awardLevels.map((level) => (
                          <tr key={level}>
                            <th scope="row">
                              {
                                {
                                  CITY: 'Kabupaten/kota',
                                  PROVINCE: 'Provinsi',
                                  NATIONAL: 'Nasional',
                                }[level]
                              }
                            </th>
                            <td>{awardPoints(level, 'INTERNAL')}</td>
                            <td>{awardPoints(level, 'EXTERNAL')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p>
                    Poin dibagi 25 sebelum diberi bobot 15%. Perolehan 25 poin menyumbang 15 pada
                    skor akhir sumbu Y.
                  </p>
                  <Field label="Penghitungan penghargaan">
                    <select name="award_mode" defaultValue={config.award_mode}>
                      <option value="HIGHEST">Penghargaan tertinggi / tahun</option>
                      <option value="CAPPED_SUM">Akumulasi, dibatasi maksimum 25 poin</option>
                    </select>
                  </Field>
                  <p>
                    <strong>Penilaian ketua tim · {weights.leader}%</strong>
                  </p>
                  <p>Rata-rata penilaian ketua tim yang sudah dikirim pada periode terpilih.</p>
                </div>
              </section>
            </div>
          </Form>
        </>
      )}
    </State>
  );
}
export function NineBoxSettingsPanel() {
  return (
    <Panel
      title="Konfigurasi matriks 9 box"
      description="Batas kategori, sumber asesmen, serta acuan pengembangan dan kualifikasi."
    >
      <NineBoxConfigEditor />
    </Panel>
  );
}
export function NineBoxInputDialog({
  row,
  config,
  onClose,
  onSaved,
}: {
  row: NineBoxRow;
  config: NineBoxConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { period } = usePeriod();
  const state = useApi(period ? `/nine-box/${period.id}/inputs/${row.employee_id}` : null);
  const { notify } = useFeedback();
  return (
    <Dialog title={'Komponen potensial - ' + row.name} onClose={onClose}>
      <State {...state} retry={state.refresh}>
        {state.data && (
          <>
            <div className="nine-form-context">
              <strong>Riwayat pendidikan</strong>
              {state.data.education.length ? (
                <ul>
                  {state.data.education.map((e: any) => (
                    <li key={e.id}>
                      {e.level} - {e.study_program}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Belum ada riwayat pendidikan. Lengkapi dari halaman Pendidikan Formal.</p>
              )}
              <strong>Pelatihan yang tercatat</strong>
              {state.data.training.length ? (
                <ul>
                  {state.data.training.slice(0, 6).map((t: any) => (
                    <li key={t.id}>
                      {t.name} - {number(t.hours)} jam{t.verified ? ' / terverifikasi' : ''}
                      {' / '}{t.job_match == null ? 'kesesuaian belum dinilai' : t.job_match ? 'sesuai pekerjaan' : 'tidak sesuai pekerjaan'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Belum ada pelatihan pada periode ini.</p>
              )}
            </div>
            <Form
              cancel={onClose}
              onSubmit={async (d) => {
                const input = state.data.input;
                await put(`/nine-box/${period!.id}/inputs/${row.employee_id}`, {
                  assessment_score:
                    config.assessment_source === 'DNA'
                      ? input.assessment_score
                      : string(d, 'assessment_score') === ''
                        ? null
                        : Number(d.get('assessment_score')),
                  assessment_source:
                    config.assessment_source === 'DNA'
                      ? input.assessment_source
                      : string(d, 'assessment_source'),
                  assessment_date:
                    config.assessment_source === 'DNA'
                      ? input.assessment_date?.slice(0, 10) || null
                      : string(d, 'assessment_date') || null,
                  education_level: string(d, 'education_level') || null,
                  field_match: input.field_match,
                  field_match_note: input.field_match_note,
                });
                notify('Komponen potensial disimpan.');
                onSaved();
                onClose();
              }}
            >
              {config.assessment_source === 'DNA' ? (
                <div className="nine-form-context">
                  <strong>Asesmen potensi dihitung otomatis dari DNA</strong>
                  <p>
                    Rata-rata 30 jawaban yang sudah dikirim, pada skala 0-100. Profil Drive,
                    Network, Action dan kecenderungan pekerjaan tetap tersedia.
                  </p>
                </div>
              ) : (
                <>
                  <Field label="Nilai asesmen potensi (0-100)">
                    <input
                      type="number"
                      name="assessment_score"
                      min="0"
                      max="100"
                      step="0.01"
                      defaultValue={state.data.input.assessment_score ?? ''}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Sumber / penyelenggara asesmen">
                      <input
                        name="assessment_source"
                        maxLength={240}
                        defaultValue={state.data.input.assessment_source}
                      />
                    </Field>
                    <Field label="Tanggal asesmen">
                      <input
                        name="assessment_date"
                        type="date"
                        max={`${period?.year}-12-31`}
                        defaultValue={state.data.input.assessment_date?.slice(0, 10) || ''}
                      />
                    </Field>
                  </div>
                </>
              )}
              <Field
                label="Jenjang pendidikan yang dinilai"
                hint="Pilih jenjang yang telah diperiksa berdasarkan riwayat pendidikan."
              >
                <select
                  name="education_level"
                  defaultValue={state.data.input.education_level || ''}
                >
                  <option value="">Belum dikonfirmasi</option>
                  {educationLevels.map((level) => (
                    <option value={level} key={level}>
                      {level} - skor {config.education_scores[level]}
                      {state.data.education.some((e: any) => normalizeEducation(e.level) === level)
                        ? ' / ada di riwayat'
                        : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <p>Kesesuaian dinilai per pelatihan di menu Kualifikasi.</p>
            </Form>
          </>
        )}
      </State>
    </Dialog>
  );
}
export function AwardClassificationDialog({
  award,
  periodId,
  onClose,
  onSaved,
}: {
  award: any;
  periodId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog title={'Klasifikasi penghargaan - ' + award.name} onClose={onClose}>
      <Form
        cancel={onClose}
        onSubmit={async (d) => {
          await patch(`/nine-box/${periodId}/awards/${award.id}`, {
            award_level: string(d, 'award_level'),
            award_scope: string(d, 'award_scope'),
          });
          onSaved();
          onClose();
        }}
      >
        <Field label="Tingkat penghargaan">
          <select name="award_level" defaultValue={award.award_level || ''} required>
            <option value="" disabled>
              Pilih tingkat
            </option>
            <option value="CITY">Kabupaten / kota</option>
            <option value="PROVINCE">Provinsi</option>
            <option value="NATIONAL">Nasional</option>
          </select>
        </Field>
        <Field label="Cakupan penghargaan">
          <select name="award_scope" defaultValue={award.award_scope || ''} required>
            <option value="" disabled>
              Pilih cakupan
            </option>
            <option value="INTERNAL">Internal BPS</option>
            <option value="EXTERNAL">Eksternal BPS</option>
          </select>
        </Field>
        <div className="nine-form-context">
          Poin internal BPS: kabupaten/kota 5, provinsi 10, nasional 20. Poin eksternal BPS:
          kabupaten/kota 10, provinsi 15, nasional 25. Penghargaan tertinggi dinormalisasi terhadap
          25 dan menyumbang maksimal 15 poin sumbu Y. Hanya bukti terverifikasi yang dihitung.
        </div>
      </Form>
    </Dialog>
  );
}
