import { ChartNoAxesColumnIncreasing, CheckCircle2, Info } from 'lucide-react';
import {
  dnaClusters,
  dnaClusterInfo,
  dnaComposition,
  dnaLevelValues,
  dnaValueLevel,
  type DnaResult,
  type DnaAssessment,
} from '../../shared/potential-dna';
import { Panel, Badge, number, date } from './ui';
import './DnaResults.css';
import { useApi, useAuth } from '../lib/context';
import { State } from './ui';

export function DnaResults({ result }: { result: DnaResult }) {
  const { user } = useAuth();
  const isManager = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';
  const leaders = result.formations.filter((formation) => formation.rank === 1);
  const composition = result.composition ?? dnaComposition(result.scores);
  return (
    <div className="dna-results">
      <Panel
        className="dna-result-intro"
        title="Hasil profil potensi"
        description="Ringkasan kecenderungan berdasarkan jawaban Anda pada 30 pernyataan."
      >
        <span className="dna-kicker">
          <ChartNoAxesColumnIncreasing size={17} /> KECENDERUNGAN UTAMA
        </span>
        <h2>{result.dominant.map((cluster) => dnaClusterInfo[cluster].name).join(' · ')}</h2>
        <p>
          {result.dominant.length === 1
            ? 'Klaster ini memiliki rata-rata persetujuan tertinggi pada jawaban Anda.'
            : 'Ada skor klaster yang setara. Seluruh kecenderungan dengan skor tertinggi ditampilkan bersama.'}{' '}
          Setiap klaster terdiri dari 10 pernyataan dengan bobot yang sama.
        </p>
        <div
          className="dna-composition-bar"
          role="img"
          aria-label="Komposisi Drive, Network, Action berjumlah 100 persen"
        >
          {dnaClusters.map((cluster) => (
            <span
              key={cluster}
              className={`dna-${cluster.toLowerCase()}`}
              style={{ width: `${composition[cluster]}%` }}
              title={`${dnaClusterInfo[cluster].name} ${number(composition[cluster])}%`}
            />
          ))}
        </div>
        <p className="dna-composition-caption">
          Komposisi potensi · Drive + Network + Action = 100%.
        </p>
        {Object.values(result.scores).every((score) => score === 0) && (
          <p>
            Seluruh jawaban bernilai nol. Komposisi ditampilkan seimbang, bukan menunjukkan dominasi
            salah satu klaster.
          </p>
        )}
      </Panel>
      <div className="dna-score-grid">
        {dnaClusters.map((cluster) => (
          <section
            className={`dna-cluster dna-${cluster.toLowerCase()}`}
            key={cluster}
            aria-label={`Hasil ${dnaClusterInfo[cluster].name}`}
          >
            <div className="dna-cluster-heading">
              <h3>{dnaClusterInfo[cluster].name}</h3>
              {result.dominant.includes(cluster) && (
                <Badge tone="blue">Dominan{result.dominant.length > 1 ? ' bersama' : ''}</Badge>
              )}
            </div>
            <strong className="dna-score">
              {number(composition[cluster])}
              <small>%</small>
            </strong>
            <progress
              value={composition[cluster]}
              max={100}
              aria-label={`Skor ${dnaClusterInfo[cluster].name}`}
            />
            <p>
              {dnaClusterInfo[cluster].name} membentuk {number(composition[cluster])}% dari
              komposisi potensi Anda. {dnaClusterInfo[cluster].description}{' '}
              {result.dominant.includes(cluster)
                ? 'Termasuk kecenderungan utama Anda.'
                : 'Melengkapi kecenderungan utama Anda.'}
            </p>
            {isManager && result.highlights && (
              <details>
                <summary>Pernyataan dengan persetujuan tertinggi</summary>
                <ul>
                  {result.highlights[cluster].map((item) => (
                    <li key={item.number}>
                      “{item.text}” <strong>{number(item.value)}/100</strong>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        ))}
      </div>
      <Panel
        title="Kecenderungan formasi"
        description="Persentase kemiripan jawaban dengan acuan empat formasi dalam dokumen pemetaan."
      >
        <div className="dna-fit-summary">
          <CheckCircle2 size={21} />
          <p>
            <strong>{leaders.map((formation) => formation.name).join(' · ')}</strong>
            <span>
              {leaders.length > 1
                ? 'Beberapa formasi memiliki kemiripan tertinggi yang sama.'
                : 'Memiliki kemiripan tertinggi dengan acuan yang digunakan.'}{' '}
              Ini merupakan bahan pertimbangan pengembangan dan penugasan, bukan keputusan
              penempatan jabatan.
            </span>
          </p>
        </div>
        <div className="dna-formations">
          {result.formations.map((formation) => (
            <article className="dna-formation" key={formation.id}>
              <div className="dna-formation-heading">
                <div>
                  <span className="dna-rank">Urutan {formation.rank}</span>
                  <h3>{formation.name}</h3>
                </div>
                <strong>
                  {number(formation.match)}
                  <small>%</small>
                </strong>
              </div>
              <progress
                value={formation.match}
                max={100}
                aria-label={`Kemiripan ${formation.name}`}
              />
              <p>{formation.description}</p>
              <p>
                {formation.strengths.length ? (
                  <>
                    Jawaban paling mendekati acuan pada{' '}
                    <strong>{formation.strengths.join(', ').toLocaleLowerCase('id')}</strong>.
                  </>
                ) : (
                  'Belum ada aspek dengan selisih paling banyak 25 poin dari acuan formasi ini.'
                )}
              </p>
              {formation.development.length > 0 && (
                <p className="muted">
                  Aspek yang perlu ditelaah lebih lanjut:{' '}
                  {formation.development.join(', ').toLocaleLowerCase('id')}.
                </p>
              )}
              <details>
                <summary>Lihat rincian perbandingan {formation.name}</summary>
                <div className="table-wrap">
                  <table>
                    <caption className="sr-only">Rincian kemiripan {formation.name}</caption>
                    <thead>
                      <tr>
                        <th>{isManager ? 'Aspek / nomor soal' : 'Aspek'}</th>
                        <th>Jawaban</th>
                        <th>Acuan</th>
                        <th>Selisih (acuan - jawaban)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formation.aspects.map((aspect) => (
                        <tr key={aspect.name}>
                          <td>
                            <strong>{aspect.name}</strong>
                            <small>
                              {aspect.detail}
                              {isManager &&
                                aspect.numbers &&
                                ` · Soal ${aspect.numbers.join(' & ')}`}
                            </small>
                          </td>
                          <td>
                            {number(aspect.actual)}
                            <small>{dnaValueLevel(aspect.actual)}</small>
                          </td>
                          <td>
                            {number(aspect.ideal)}
                            <small>{aspect.level}</small>
                          </td>
                          <td>{number(aspect.gap)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </article>
          ))}
        </div>
        {isManager && (
          <details className="dna-method">
            <summary>
              <Info size={16} /> Cara menghitung hasil ini
            </summary>
            <p>
              Rata-rata tiap klaster = jumlah nilai 10 pernyataan ÷ 10. Komposisi klaster =
              rata-rata klaster ÷ jumlah ketiga rata-rata × 100%. Semua pernyataan berbobot sama.
              Pembulatan dua desimal disesuaikan agar total tepat 100%; dominasi ditentukan sebelum
              pembulatan. Bila semua rata-rata nol, komposisi ditampilkan seimbang tanpa dominasi
              tunggal.
            </p>
            <p>
              Acuan formasi sesuai revisi 11 November 2026:{' '}
              {Object.entries(dnaLevelValues)
                .map(([level, value]) => `${level} ${value}%`)
                .join(', ')}
              . Setiap kategori memiliki nilai berbeda. Label mutlak tinggi pada dokumen memakai
              kategori tertinggi Moderat tinggi. Acuan formasi terpisah dari komposisi D/N/A. Hasil
              ditampilkan memakai perhitungan terbaru dari jawaban tersimpan.
            </p>
            <p>
              Nilai aspek = rata-rata dua pernyataan pada masing-masing dari tujuh baris tabel empat
              formasi. Kemiripan = 100 − rata-rata selisih absolut antara nilai tujuh aspek dan
              acuan formasi. Ketujuh aspek berbobot sama. Hanya 14 pernyataan yang disebut dalam
              tabel ini digunakan untuk kemiripan; seluruh 30 pernyataan tetap digunakan untuk
              D/N/A.
            </p>
            <p>
              Angka kemiripan bukan probabilitas keberhasilan kerja. Dokumen tidak menetapkan
              pembalikan skor, sehingga nilai pernyataan digunakan apa adanya. Profil ini disimpan
              terpisah dari komposisi D/N/A. Rata-rata 30 jawaban pada skala 0-100 menyumbang 30%
              sumbu potensial (X) pada matriks 9 box.
            </p>
          </details>
        )}
        {isManager && (
          <details className="dna-method">
            <summary>Catatan formasi dari dokumen</summary>
            <p>
              Statistisi Ahli Pertama menekankan pengumpulan, pemeriksaan, pengolahan, dan analisis
              deskriptif data. Statistisi Ahli Muda lebih menekankan metodologi, analisis yang lebih
              kompleks, pengarahan tim, dan komunikasi hasil statistik.
            </p>
            <p>
              Pranata Komputer Ahli Pertama menekankan implementasi aplikasi, pengelolaan
              sistem/basis data, dan penanganan masalah teknis. Dokumen menyoroti fleksibilitas,
              pemecahan masalah, ketelitian, ide baru, logika, serta kerja mandiri dalam
              perbandingan tambahan dengan Statistisi. Tabel tambahan ini menjadi penjelasan, tanpa
              menambah bobot pada tujuh aspek utama.
            </p>
          </details>
        )}
      </Panel>
    </div>
  );
}

export function DnaReview({ assessment }: { assessment: DnaAssessment }) {
  const { user } = useAuth();
  const isManager = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';
  const count = Object.keys(assessment.answers).length;
  return (
    <div className="dna-review">
      {assessment.result && <DnaResults result={assessment.result} />}
      <Panel
        title={isManager ? 'Jawaban potensi Drive / Network / Action' : 'Jawaban asesmen potensi'}
        description={
          assessment.submitted_at
            ? `Dikirim ${date(assessment.submitted_at)} · Jawaban terkunci`
            : assessment.updated_at
              ? `Draft terakhir ${date(assessment.updated_at)}`
              : 'Belum ada jawaban tersimpan untuk tahun ini.'
        }
        actions={
          <Badge tone={assessment.submitted_at ? 'green' : 'neutral'}>
            {assessment.submitted_at ? 'Terkirim' : count ? 'Draft' : 'Belum diisi'}
          </Badge>
        }
      >
        <p className="muted dna-review-count">
          {count} dari 30 pernyataan terjawab{isManager && ' · Skala 0–100'}
        </p>
        {!isManager && (
          <ol className="dna-personal-answers">
            {assessment.questions.map((question) => {
              const value = assessment.answers[question.id];
              const label =
                value == null
                  ? 'Belum dijawab'
                  : value === 0
                    ? 'Sangat tidak setuju'
                    : value === 100
                      ? 'Sangat setuju'
                      : value === 50
                        ? 'Di titik tengah'
                        : value < 50
                          ? 'Condong tidak setuju'
                          : 'Condong setuju';
              return (
                <li key={question.id}>
                  <p>
                    <span className="muted">{question.number}. </span>
                    {question.text}
                  </p>
                  <span className="muted">{label}</span>
                </li>
              );
            })}
          </ol>
        )}
        {isManager &&
          dnaClusters.map((cluster) => (
            <details key={cluster} className="dna-answer-group">
              <summary>
                {dnaClusterInfo[cluster].name} ·{' '}
                {
                  assessment.questions.filter(
                    (q) => q.cluster === cluster && assessment.answers[q.id] !== undefined,
                  ).length
                }
                /10 terjawab
              </summary>
              <ol>
                {assessment.questions
                  .filter((q) => q.cluster === cluster)
                  .map((question) => (
                    <li key={question.id}>
                      <p>
                        <span className="muted">{question.number}. </span>
                        {question.text}
                      </p>
                      <strong>
                        {assessment.answers[question.id] ?? '—'}
                        <small> / 100</small>
                      </strong>
                    </li>
                  ))}
              </ol>
            </details>
          ))}
      </Panel>
    </div>
  );
}

export function EmployeeDnaReview({
  periodId,
  employeeId,
}: {
  periodId: string;
  employeeId: string;
}) {
  const state = useApi<DnaAssessment>(`/potential-dna/${periodId}/${employeeId}`);
  return (
    <State {...state} retry={state.refresh}>
      {state.data && <DnaReview assessment={state.data} />}
    </State>
  );
}
