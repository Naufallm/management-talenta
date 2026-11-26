import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, LockKeyhole, Save, Send } from 'lucide-react';
import { useApi, useAuth, usePeriod } from '../lib/context';
import { put } from '../lib/api';
import {
  PageHeader,
  Panel,
  Empty,
  Button,
  Badge,
  Dialog,
  date,
  useFeedback,
} from '../components/ui';
import { DnaResults, DnaReview } from '../components/DnaResults';
import { TransitionState } from '../components/TransitionState';
import { DnaHistory } from '../components/DnaHistory';
import type { DnaAssessment } from '../../shared/potential-dna';
import type { Period } from '../../shared/contracts';
import './PotentialDna.css';

function agreementLabel(value: number) {
  if (value === 0) return 'Sangat tidak setuju';
  if (value === 100) return 'Sangat setuju';
  if (value === 50) return 'Di titik tengah';
  return value < 50 ? 'Condong tidak setuju' : 'Condong setuju';
}

export function PotentialDna() {
  const { user } = useAuth(),
    { period } = usePeriod();
  const state = useApi<DnaAssessment>(
    period && user?.employee_id ? `/potential-dna/${period.id}/${user.employee_id}` : null,
  );
  return (
    <div className="potential-dna-page">
      <PageHeader
        title="Asesmen Potensi"
        description={`Penilaian tahunan ${period?.year || '—'} · 30 pernyataan`}
      />
      {user?.employee_id && (
        <DnaHistory
          key={`${user.employee_id}/${state.data?.submitted_at || ''}`}
          employeeId={user.employee_id}
        />
      )}
      <TransitionState {...state} retry={state.refresh} transitionKey={period?.id}>
        {!period ? (
          <Panel>
            <Empty
              title="Belum ada periode penilaian"
              description="Hubungi Admin untuk menyiapkan periode tahunan."
            />
          </Panel>
        ) : (
          state.data &&
          (state.data.result ? (
            <>
              <div className="dna-submitted">
                <LockKeyhole size={18} />
                <p>
                  <strong>Asesmen tahun {period.year} sudah selesai</strong>
                  <span>
                    Dikirim {date(state.data.submitted_at)}. Jawaban terkunci; pengisian berikutnya
                    tersedia pada periode tahun berikutnya.
                  </span>
                </p>
              </div>
              <DnaResults result={state.data.result} />
              <details className="dna-submitted-answers">
                <summary>Lihat seluruh jawaban saya</summary>
                <DnaReview assessment={{ ...state.data, result: null }} />
              </details>
            </>
          ) : period.status === 'CLOSED' ? (
            <DnaReview assessment={state.data} />
          ) : (
            <DnaSession
              key={period.id}
              initial={state.data}
              period={period}
              refresh={state.refresh}
            />
          ))
        )}
      </TransitionState>
    </div>
  );
}

function DnaSession({
  initial,
  period,
  refresh,
}: {
  initial: DnaAssessment;
  period: Period;
  refresh: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(!!initial.instructions_accepted_at);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState(initial.answers);
  const [values, setValues] = useState<Record<string, number>>(initial.answers);
  const [saved, setSaved] = useState(JSON.stringify(initial.answers));
  const [status, setStatus] = useState(
    initial.updated_at ? 'Draft tersimpan' : 'Belum ada jawaban tersimpan',
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const movement = useRef(new Set<string>());
  const scroller = useRef<HTMLDivElement>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const currentAnswers = useRef(answers);
  const { notify } = useFeedback();
  const questions = initial.questions;
  const count = questions.filter((q) => answers[q.id] !== undefined).length;
  const firstUnanswered = questions.findIndex((q) => answers[q.id] === undefined);
  const unlocked = firstUnanswered === -1 ? questions.length : firstUnanswered + 1;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const available =
    period.status === 'OPEN' &&
    today >= period.starts_on.slice(0, 10) &&
    today <= period.ends_on.slice(0, 10);
  const dirty = JSON.stringify(answers) !== saved;
  const persist = useCallback(
    (snapshot: Record<string, number>, submit = false) => {
      const serialized = JSON.stringify(snapshot);
      const next = saveChain.current
        .catch(() => undefined)
        .then(async () => {
          setStatus(submit ? 'Mengirim jawaban…' : 'Menyimpan draft…');
          await put(`/potential-dna/${period.id}`, {
            version: initial.version,
            question_revision: initial.question_revision,
            instructions_accepted: true,
            answers: snapshot,
            submit,
          });
          setSaved(serialized);
          setError('');
          setStatus(
            JSON.stringify(currentAnswers.current) === serialized
              ? 'Draft tersimpan'
              : 'Ada perubahan yang belum tersimpan',
          );
        });
      saveChain.current = next;
      return next;
    },
    [initial.version, initial.question_revision, period.id],
  );
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  function scrollToQuestion(index: number, focus = false) {
    requestAnimationFrame(() => {
      const card = scroller.current?.querySelector<HTMLElement>(`[data-question-index="${index}"]`);
      if (!card || !scroller.current) return;
      scroller.current.scrollTo({
        top: card.offsetTop,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
      if (focus)
        card.querySelector<HTMLInputElement>('input[type="range"]')?.focus({ preventScroll: true });
    });
  }
  function commit(id: string, index: number, keyboard = false) {
    if (!movement.current.has(id) || busy || !available) return;
    movement.current.delete(id);
    const next = { ...currentAnswers.current, [id]: values[id] ?? 50 };
    currentAnswers.current = next;
    setAnswers(next);
    setStatus('Ada perubahan yang belum tersimpan');
    void persist(next).catch((e: Error) => {
      setError(e.message);
      setStatus('Draft belum tersimpan');
    });
    if (index + 1 < questions.length) scrollToQuestion(index + 1, keyboard);
  }
  async function begin() {
    setBusy(true);
    setError('');
    try {
      await persist(answers);
      setStarted(true);
      setTimeout(() => scrollToQuestion(firstUnanswered === -1 ? 0 : firstUnanswered), 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(submit: boolean) {
    setBusy(true);
    setError('');
    try {
      await persist(currentAnswers.current, submit);
      if (submit) {
        setReview(false);
        refresh();
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else notify('Draft potensi tersimpan.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!started)
    return (
      <Panel
        className="dna-guide"
        title="Kenali cara kerja dan kecenderungan Anda"
        description="Luangkan waktu untuk membaca panduan sebelum memulai."
      >
        <div className="dna-guide-icon">
          <BookOpen size={28} />
        </div>
        <div className="dna-guide-facts">
          <Badge tone="blue">30 pernyataan</Badge>
          <Badge>Draft otomatis</Badge>
          <Badge>Satu kali per tahun</Badge>
        </div>
        <ol className="dna-instructions">
          <li>
            <strong>Jawab sesuai diri Anda saat ini.</strong>
            <span>
              Pilih tingkat persetujuan berdasarkan kebiasaan Anda, tanpa mencari jawaban yang
              dianggap paling baik.
            </span>
          </li>
          <li>
            <strong>Geser slider dari posisi tengah.</strong>
            <span>
              Ke kiri berarti semakin tidak setuju; ke kanan berarti semakin setuju. Posisi awal
              belum dianggap jawaban sebelum slider digeser. Anda boleh kembali memilih titik tengah
              setelah menggesernya.
            </span>
          </li>
          <li>
            <strong>Lepaskan slider untuk melanjutkan.</strong>
            <span>
              Soal berikutnya terbuka dan bergeser otomatis setelah Anda menggeser lalu melepas
              slider. Anda bisa scroll kembali ke atas untuk mengubah jawaban. Dengan keyboard,
              gunakan tombol panah pada slider.
            </span>
          </li>
          <li>
            <strong>Draft dapat dilanjutkan.</strong>
            <span>
              Jawaban disimpan otomatis setelah perubahan; pastikan status “Draft tersimpan” sebelum
              meninggalkan halaman. Setelah semua 30 pernyataan terisi, tinjau lalu kirim. Jawaban
              terkunci untuk tahun ini dan ringkasan potensi beserta kecenderungan formasi akan
              tampil.
            </span>
          </li>
        </ol>
        {initial.updated_at && (
          <p className="dna-resume">
            <CheckCircle2 size={17} /> Terdapat draft {count}/30 pernyataan. Jawaban Anda tetap
            tersimpan.
          </p>
        )}
        {!available && (
          <p className="dna-inline-error" role="status">
            Periode ini belum dibuka atau sudah berakhir. Pengisian tersedia sesuai jadwal yang
            ditetapkan Admin.
          </p>
        )}
        <label className="dna-ack">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>Saya sudah membaca dan memahami panduan pengisian.</span>
        </label>
        {error && (
          <p className="dna-inline-error" role="alert">
            {error}
          </p>
        )}
        <Button disabled={!acknowledged || busy || !available} onClick={() => void begin()}>
          {busy ? 'Menyiapkan asesmen…' : count ? 'Lanjutkan pengisian' : 'Mulai asesmen'}
        </Button>
      </Panel>
    );
  return (
    <div className="dna-session">
      <div className="dna-session-progress">
        <div>
          <strong>{count} / 30 terjawab</strong>
          <span aria-live="polite">{status}</span>
        </div>
        <progress aria-label="Kemajuan asesmen potensi" value={count} max={30} />
        <p>
          Geser dan lepaskan slider untuk melanjutkan. Scroll ke atas untuk meninjau jawaban
          sebelumnya.
        </p>
      </div>
      <div
        className="dna-scroll"
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Pernyataan potensi, scroll untuk meninjau jawaban"
      >
        {questions.slice(0, unlocked).map((question, index) => (
          <section
            className="dna-question-card"
            key={question.id}
            data-question-index={index}
            aria-label={`Pernyataan ${question.number}`}
          >
            <div className="dna-question-meta">
              <span>PERNYATAAN {String(question.number).padStart(2, '0')} / 30</span>
              <Badge tone={answers[question.id] !== undefined ? 'green' : 'neutral'}>
                {answers[question.id] !== undefined ? 'Terjawab' : 'Geser untuk menjawab'}
              </Badge>
            </div>
            <h2 id={`label-${question.id}`}>{question.text}</h2>
            <div className="dna-slider-control">
              <input
                id={`slider-${question.id}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={values[question.id] ?? 50}
                aria-labelledby={`label-${question.id}`}
                aria-describedby={`hint-${question.id}`}
                aria-valuetext={agreementLabel(values[question.id] ?? 50)}
                disabled={busy || !available}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  movement.current.add(question.id);
                  setValues((previous) => ({ ...previous, [question.id]: value }));
                }}
                onPointerUp={() => commit(question.id, index)}
                onBlur={() => commit(question.id, index)}
                onKeyUp={(event) => {
                  if (
                    [
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                      'Home',
                      'End',
                      'PageUp',
                      'PageDown',
                    ].includes(event.key)
                  )
                    commit(question.id, index, true);
                }}
              />
              <div className="dna-slider-labels">
                <span>Sangat tidak setuju</span>
                <span>Sangat setuju</span>
              </div>
              <p id={`hint-${question.id}`}>
                {answers[question.id] === undefined
                  ? 'Posisi awal belum dihitung sebagai jawaban. Geser slider terlebih dahulu.'
                  : 'Jawaban tercatat. Anda masih dapat mengubahnya sebelum dikirim.'}
              </p>
            </div>
            <div className="dna-scroll-hint">
              <ChevronDown size={18} />
              <span>
                {answers[question.id] !== undefined
                  ? index === 29
                    ? 'Seluruh pernyataan sudah terisi. Tinjau dan kirim di bawah.'
                    : 'Jawaban terisi. Anda dapat scroll ke pernyataan berikutnya.'
                  : 'Pernyataan berikutnya terbuka setelah slider digeser.'}
              </span>
            </div>
          </section>
        ))}
      </div>
      {error && (
        <p className="dna-inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="dna-session-actions">
        <Button variant="secondary" disabled={busy || !available} onClick={() => void save(false)}>
          <Save size={16} />
          Simpan draft
        </Button>
        <Button disabled={busy || count !== 30 || !available} onClick={() => setReview(true)}>
          <Send size={16} />
          Tinjau & kirim
        </Button>
      </div>
      {review && (
        <Dialog title="Tinjau jawaban potensi" onClose={() => !busy && setReview(false)}>
          <p>
            Seluruh 30 pernyataan telah dijawab. Setelah dikirim, asesmen tahun {period.year}{' '}
            dikunci dan hasil akan ditampilkan.
          </p>
          <ol className="review-list">
            {questions.map((q) => (
              <li key={q.id}>
                <strong>
                  {q.number}. {q.text}
                </strong>
                <div
                  className="dna-review-agreement"
                  role="img"
                  aria-label={`Jawaban: ${agreementLabel(answers[q.id])}`}
                >
                  <div className="dna-review-track">
                    <span style={{ left: `${answers[q.id]}%` }} />
                  </div>
                  <div className="dna-slider-labels">
                    <span>Sangat tidak setuju</span>
                    <span>Sangat setuju</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {error && (
            <p className="dna-inline-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setReview(false)}>
              Kembali mengisi
            </Button>
            <Button disabled={busy} onClick={() => void save(true)}>
              {busy ? 'Mengirim…' : 'Kirim jawaban potensi'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
