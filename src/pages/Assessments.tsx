import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, Save, Send, ShieldCheck } from 'lucide-react';
import { useAuth, useApi, usePeriod } from '../lib/context';
import { put, post } from '../lib/api';
import {
  PageHeader,
  Panel,
  State,
  Empty,
  Button,
  Badge,
  Dialog,
  Field,
  Form,
  number,
  string,
  useFeedback,
  date,
} from '../components/ui';
import type { Question, Period } from '../../shared/contracts';
import { indicators } from '../../shared/constants';
const options = ['Sangat tidak sesuai', 'Tidak sesuai', 'Cukup sesuai', 'Sesuai', 'Sangat sesuai'];
export function Assessment({ kind = 'potential' }: { kind?: 'potential' | 'psych' }) {
  const { user } = useAuth(),
    { period } = usePeriod(),
    { run, notify } = useFeedback(),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [review, setReview] = useState(false),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false);
  const questions = useApi<Question[]>(period ? `/periods/${period.id}/questions/${kind}` : null),
    state = useApi(
      period && user?.employee_id ? `/assessments/${kind}/${period.id}/${user.employee_id}` : null,
    ),
    locked = !!state.data?.submitted_at;
  useEffect(() => {
    setAnswers(state.data?.answers || {});
    setDirty(false);
  }, [state.data]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const count = questions.data?.filter((q) => answers[q.id] !== undefined).length || 0,
    total = questions.data?.length || 0;
  const save = async (submit: boolean) => {
    setBusy(true);
    try {
      await put(`/assessments/${kind}/${period!.id}`, { answers, submit });
      setDirty(false);
      setReview(false);
      state.refresh();
      notify(submit ? 'Jawaban telah dikirim dan dikunci.' : 'Draft jawaban disimpan.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title={kind === 'psych' ? 'Asesmen Psikologi' : 'Asesmen Potensi'}
        description={`Penilaian tahunan ${period?.year || '—'} · ${kind === 'psych' ? 'Jawaban hanya dapat dibaca oleh Anda dan Admin.' : 'Refleksi kemampuan manajerial dan teknis Anda.'}`}
      />
      <State
        loading={questions.loading || state.loading}
        error={questions.error || state.error}
        retry={() => {
          questions.refresh();
          state.refresh();
        }}
      >
        {!period || !questions.data?.length ? (
          <Panel>
            <Empty
              title="Asesmen belum tersedia"
              description="Bank soal belum disiapkan untuk periode ini."
            />
          </Panel>
        ) : (
          <>
            {kind === 'psych' && (
              <div className="privacy-note">
                <ShieldCheck size={23} />
                <div>
                  <strong>{state.data?.result?.status || 'Instrumen menunggu validasi'}</strong>
                  <p>
                    {state.data?.result?.message ||
                      'Tidak ada perhitungan atau kategori klinis sebelum validasi psikolog.'}
                  </p>
                </div>
              </div>
            )}
            <Panel
              title={locked ? 'Asesmen telah dikirim' : 'Lengkapi jawaban Anda'}
              description={
                locked
                  ? `Dikirim pada ${date(state.data.submitted_at)}. Jawaban terkunci.`
                  : 'Pilih jawaban yang paling menggambarkan diri Anda.'
              }
              actions={
                <Badge tone={locked ? 'green' : 'blue'}>
                  {locked ? (
                    <>
                      <LockKeyhole size={12} />
                      Terkunci
                    </>
                  ) : (
                    `${count} / ${total} terjawab`
                  )}
                </Badge>
              }
            >
              <progress
                className="assessment-progress"
                value={count}
                max={total}
                aria-label="Kemajuan asesmen"
              />
              <fieldset
                className="question-list"
                disabled={locked || busy || period.status !== 'OPEN'}
              >
                {questions.data.map((q, i) => (
                  <div className="question" key={q.id}>
                    <div className="question-heading">
                      <span className="question-number">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <span className="eyebrow">{q.category}</span>
                        <h3>{q.text}</h3>
                      </div>
                    </div>
                    <div className="answer-options" role="radiogroup" aria-label={q.text}>
                      {options.map((label, index) => (
                        <label
                          key={label}
                          className={answers[q.id] === index + 1 ? 'selected' : ''}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={index + 1}
                            checked={answers[q.id] === index + 1}
                            onChange={() => {
                              setAnswers((a) => ({ ...a, [q.id]: index + 1 }));
                              setDirty(true);
                            }}
                          />
                          <strong>{index + 1}</strong>
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>
              {!locked && (
                <div className="assessment-actions">
                  <span className="muted">
                    {dirty
                      ? 'Ada jawaban yang belum disimpan.'
                      : 'Draft tersimpan di server setelah Anda menekan Simpan.'}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={busy || period.status !== 'OPEN'}
                    onClick={() => void run(() => save(false))}
                  >
                    <Save size={16} />
                    Simpan draft
                  </Button>
                  <Button
                    disabled={busy || count !== total || period.status !== 'OPEN'}
                    onClick={() => setReview(true)}
                  >
                    <Send size={16} />
                    Review & kirim
                  </Button>
                </div>
              )}
            </Panel>
          </>
        )}
      </State>
      {review && (
        <Dialog title="Review jawaban" onClose={() => !busy && setReview(false)}>
          <p>Setelah dikirim, jawaban dikunci untuk periode ini.</p>
          <ol className="review-list">
            {questions.data?.map((q) => (
              <li key={q.id}>
                <strong>{q.text}</strong>
                <span>
                  {answers[q.id]} · {options[answers[q.id] - 1]}
                </span>
              </li>
            ))}
          </ol>
          <div className="form-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setReview(false)}>
              Kembali mengisi
            </Button>
            <Button disabled={busy} onClick={() => void run(() => save(true))}>
              {busy ? 'Mengirim…' : 'Kirim jawaban'}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
export function AssessmentOverview() {
  const { period } = usePeriod(),
    state = useApi(period ? `/assessment-overview/${period.id}` : null),
    [reopen, setReopen] = useState<any>(null),
    { notify } = useFeedback();
  return (
    <>
      <PageHeader
        title="Penilaian Pegawai"
        description={`Pantau potensi dan kompetensi pegawai · Tahun ${period?.year || '—'}`}
        actions={
          <Link className="btn btn-secondary" to="/pengaturan">
            Kelola periode & soal
          </Link>
        }
      />
      <Panel
        title="Progres penilaian"
        description="Status asesmen potensi dan skor dari sumber penilaian yang tersedia."
      >
        <State {...state} retry={state.refresh}>
          {state.data?.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pegawai</th>
                    <th>Unit</th>
                    <th>Potensi</th>
                    <th>Kompetensi</th>
                    <th>Status potensi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <Link className="person-link" to={`/pegawai/${r.id}?tab=potensi`}>
                          {r.name}
                        </Link>
                        <small className="mono">{r.nip}</small>
                      </td>
                      <td>{r.unit}</td>
                      <td>{number(r.potential)}</td>
                      <td>{number(r.competency)}</td>
                      <td>
                        <Badge tone={r.submitted_at ? 'green' : 'orange'}>
                          {r.submitted_at ? 'Terkirim' : 'Belum terkirim'}
                        </Badge>
                      </td>
                      <td>
                        {r.submitted_at && period?.status === 'OPEN' && (
                          <Button variant="ghost" onClick={() => setReopen(r)}>
                            Buka kembali
                          </Button>
                        )}
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
      {reopen && (
        <Dialog title="Buka kembali asesmen potensi" onClose={() => setReopen(null)}>
          <p>
            Skor potensi dan posisi kuadran <strong>{reopen.name}</strong> dibatalkan sampai pegawai
            mengirim ulang.
          </p>
          <Form
            submit="Buka asesmen"
            cancel={() => setReopen(null)}
            onSubmit={async (d) => {
              await post(`/assessments/potential/${period!.id}/${reopen.id}/reopen`, {
                reason: string(d, 'reason'),
              });
              setReopen(null);
              state.refresh();
              notify('Asesmen dibuka kembali.');
            }}
          >
            <Field label="Alasan pembukaan kembali">
              <textarea name="reason" required minLength={10} maxLength={500} />
            </Field>
          </Form>
        </Dialog>
      )}
    </>
  );
}
export function LeaderAssessments() {
  const { period } = usePeriod(),
    state = useApi(period ? `/leader/${period.id}` : null),
    [selected, setSelected] = useState<any>(null),
    { notify } = useFeedback();
  return (
    <>
      <PageHeader
        title="Penilaian Anggota"
        description="Nilai anggota sesuai penugasan Ketua Tim pada tahun terpilih."
      />
      <Panel title="Anggota yang ditugaskan">
        <State {...state} retry={state.refresh}>
          {state.data?.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Anggota</th>
                    <th>Tim</th>
                    <th>Skor</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((r: any) => (
                    <tr key={`${r.id}/${r.team}`}>
                      <td>
                        <strong>{r.name}</strong>
                        <small>{r.position}</small>
                      </td>
                      <td>{r.team}</td>
                      <td>{number(r.score)}</td>
                      <td>
                        <Badge tone={r.submitted_at ? 'green' : 'orange'}>
                          {r.submitted_at ? 'Terkirim' : 'Draft / belum dinilai'}
                        </Badge>
                      </td>
                      <td>
                        <Button variant="secondary" onClick={() => setSelected(r)}>
                          {r.submitted_at ? 'Lihat' : 'Nilai anggota'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Tidak ada penugasan"
              description="Anda belum memiliki anggota untuk dinilai pada periode ini."
            />
          )}
        </State>
      </Panel>
      {selected && period && (
        <LeaderDialog
          selected={selected}
          period={period}
          onClose={() => setSelected(null)}
          onSave={(submitted) => {
            setSelected(null);
            state.refresh();
            notify(submitted ? 'Penilaian dikirim dan dikunci.' : 'Draft penilaian disimpan.');
          }}
        />
      )}
    </>
  );
}
function LeaderDialog({
  selected,
  period,
  onClose,
  onSave,
}: {
  selected: any;
  period: Period;
  onClose: () => void;
  onSave: (submitted: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, number>>(selected.indicators || {}),
    [note, setNote] = useState(selected.note || ''),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false);
  const editable = !selected.submitted_at && period.status === 'OPEN',
    complete = indicators.every(
      (key) => Number.isFinite(values[key]) && values[key] >= 0 && values[key] <= 100,
    );
  const save = async (submit: boolean) => {
    setBusy(true);
    try {
      await put(`/leader/${period.id}`, {
        employee_id: selected.id,
        indicators: values,
        note,
        submit,
      });
      onSave(submit);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title={`${review ? 'Review penilaian' : 'Penilaian'} · ${selected.name}`}
      onClose={() => !busy && onClose()}
    >
      {review ? (
        <Form
          submit="Kirim penilaian akhir"
          cancel={() => setReview(false)}
          onSubmit={() => save(true)}
        >
          <div className="review-box">
            <strong>Nilai yang akan dikirim</strong>
            {indicators.map((key) => (
              <p key={key}>
                {key}: {number(values[key])}
              </p>
            ))}
            {note && <p>Catatan: {note}</p>}
            <p>Setelah dikirim, penilaian terkunci untuk periode ini.</p>
          </div>
        </Form>
      ) : (
        <>
          <Form
            disabled={!editable || busy}
            submit="Simpan draft"
            cancel={onClose}
            onSubmit={() => save(false)}
          >
            {indicators.map((key, i) => (
              <Field key={key} label={`${key} (0–100)`}>
                <input
                  name={`indicator-${i}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={values[key] ?? ''}
                  onChange={(e) =>
                    setValues((previous) => {
                      const next = { ...previous };
                      if (e.target.value === '') delete next[key];
                      else next[key] = Number(e.target.value);
                      return next;
                    })
                  }
                />
              </Field>
            ))}
            <Field label="Catatan">
              <textarea
                name="note"
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <p className="muted">
              Draft dapat disimpan meskipun indikator belum lengkap. Lengkapi semua indikator untuk
              mengirim penilaian.
            </p>
          </Form>
          {editable && (
            <div className="form-actions">
              <Button disabled={!complete || busy} onClick={() => setReview(true)}>
                Review & kirim penilaian
              </Button>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
