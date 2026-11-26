import { EvidenceFile } from '../components/EvidenceFile';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Search } from 'lucide-react';
import type { AssessmentReview, AssessmentSummary, Period } from '../../shared/contracts';
import { useApi, usePeriod } from '../lib/context';
import { PageHeader, Panel, State, Empty, Badge, number, date } from '../components/ui';
import './AssessmentOverview.css';
import { DnaReview } from '../components/DnaResults';
import { EmployeeAvatar } from '../components/EmployeeAvatar';
import { DnaHistory } from '../components/DnaHistory';

type Kind = 'potensi' | 'kompetensi';
export function AssessmentOverview() {
  const { period } = usePeriod();
  const state = useApi<AssessmentSummary[]>(period ? `/assessment-overview/${period.id}` : null);
  const [search, setSearch] = useSearchParams();
  const [query, setQuery] = useState('');
  const kind: Kind = search.get('jenis') === 'kompetensi' ? 'kompetensi' : 'potensi';
  const selected = state.data?.find((row) => row.id === search.get('pegawai')) || state.data?.[0];
  const rows =
    state.data?.filter((row) =>
      `${row.name} ${row.nip} ${row.unit}`
        .toLocaleLowerCase('id')
        .includes(query.toLocaleLowerCase('id').trim()),
    ) || [];
  function select(kind: Kind, employeeId = selected?.id) {
    setSearch({ jenis: kind, ...(employeeId ? { pegawai: employeeId } : {}) });
  }
  return (
    <>
      <PageHeader
        title="Penilaian Pegawai"
        description={`Tinjau isian potensi dan sumber kompetensi per pegawai · Tahun ${period?.year || '—'}`}
        actions={
          <Link className="btn btn-secondary" to="/pengaturan">
            Kelola periode & soal
          </Link>
        }
      />
      <div className="review-tabs" role="tablist" aria-label="Jenis penilaian">
        {(['potensi', 'kompetensi'] as const).map((item) => (
          <button
            key={item}
            id={`review-tab-${item}`}
            role="tab"
            aria-selected={kind === item}
            aria-controls="assessment-content"
            tabIndex={kind === item ? 0 : -1}
            onClick={() => select(item)}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'potensi'
                    : event.key === 'End'
                      ? 'kompetensi'
                      : kind === 'potensi'
                        ? 'kompetensi'
                        : 'potensi';
                select(next);
                document.getElementById(`review-tab-${next}`)?.focus();
              }
            }}
          >
            {item === 'potensi' ? 'Potensi' : 'Kompetensi'}
            <span>
              {item === 'potensi' ? 'Drive / Network / Action' : 'Bukti kegiatan & Ketua Tim'}
            </span>
          </button>
        ))}
      </div>
      <div id="assessment-content" role="tabpanel" aria-labelledby={`review-tab-${kind}`}>
        <State {...state} retry={state.refresh}>
          {!period ? (
            <Panel>
              <Empty
                title="Belum ada periode penilaian"
                description="Siapkan periode agar penilaian pegawai dapat ditinjau."
              />
            </Panel>
          ) : !state.data?.length ? (
            <Panel>
              <Empty
                title="Belum ada pegawai aktif"
                description="Tambahkan pegawai melalui menu Administrasi untuk memulai penilaian."
              />
            </Panel>
          ) : (
            <div className="assessment-workspace">
              <Panel
                className="review-roster"
                title="Daftar pegawai"
                description={`${state.data.length} pegawai aktif`}
              >
                <label className="review-search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    aria-label="Cari pegawai penilaian"
                    placeholder="Cari nama, NIP, atau unit"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <div
                  className="review-employee-list"
                  role="group"
                  aria-label="Pilih pegawai penilaian"
                >
                  {rows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="review-employee"
                      aria-pressed={row.id === selected?.id}
                      aria-label={`Lihat penilaian ${row.name}`}
                      onClick={() => select(kind, row.id)}
                    >
                      <span className="review-employee-name">{row.name}</span>
                      <span className="mono">{row.nip}</span>
                      <span className="review-employee-bottom">
                        <span>{row.unit}</span>
                        <Badge
                          tone={
                            (kind === 'potensi' ? !!row.dna_submitted_at : row.competency != null)
                              ? 'green'
                              : 'neutral'
                          }
                        >
                          {kind === 'potensi'
                            ? row.dna_submitted_at
                              ? 'Terkirim'
                              : row.dna_updated_at
                                ? 'Draft'
                                : 'Belum diisi'
                            : row.competency != null
                              ? 'Lengkap'
                              : 'Belum lengkap'}
                        </Badge>
                      </span>
                    </button>
                  ))}
                  {!rows.length && (
                    <p className="muted review-no-results">
                      Pegawai tidak ditemukan. Coba nama atau NIP lain.
                    </p>
                  )}
                </div>
              </Panel>
              {selected && (
                <EmployeeReview
                  key={`${period.id}/${selected.id}`}
                  employeeId={selected.id}
                  period={period}
                  kind={kind}
                />
              )}
            </div>
          )}
        </State>
      </div>
    </>
  );
}

function Score({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  hint: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{number(value)}</strong>
      <small>{hint}</small>
    </div>
  );
}

function EmployeeReview({
  employeeId,
  period,
  kind,
}: {
  employeeId: string;
  period: Period;
  kind: Kind;
}) {
  const state = useApi<AssessmentReview>(
    `/assessment-review/${period.id}/${encodeURIComponent(employeeId)}`,
  );
  const data = state.data;
  return (
    <div className="review-detail">
      <State {...state} retry={state.refresh}>
        {data && (
          <>
            <Panel className="review-identity">
              <div className="identity-main">
                <EmployeeAvatar
                  size="large"
                  employeeId={data.employee.id}
                  version={data.employee.photo_version}
                />
                <div className="review-identity-details">
                  <h2>{data.employee.name}</h2>
                  <p>
                    {data.employee.position} · {data.employee.unit}
                  </p>
                  <small className="mono">NIP {data.employee.nip}</small>
                </div>
                <Link className="text-link" to={`/pegawai/${employeeId}?tab=${kind}`}>
                  Data pegawai <Eye size={15} aria-hidden="true" />
                </Link>
              </div>
            </Panel>
            {kind === 'potensi' ? (
              <>
                <DnaHistory employeeId={employeeId} />
                <DnaReview assessment={data.dna} />
              </>
            ) : (
              <CompetencyReview data={data} />
            )}
          </>
        )}
      </State>
    </div>
  );
}

function CompetencyReview({ data }: { data: AssessmentReview }) {
  const verified = data.evidence.filter((item) => item.verified);
  const hours = verified
    .filter((item) => item.kind === 'training')
    .reduce((sum, item) => sum + item.hours, 0);
  const awards = verified.filter((item) => item.kind === 'achievement').length;
  return (
    <>
      <div className="metric-grid three review-scores">
        <Score
          label="Bukti kegiatan"
          value={data.competency?.evidence}
          hint={`Bobot ${number(data.config.evidence_weight)}%`}
        />
        <Score
          label="Penilaian Ketua Tim"
          value={data.competency?.leader}
          hint={`Bobot ${number(data.config.leader_weight)}% · Hanya yang terkirim`}
        />
        <Score
          label="Skor kompetensi"
          value={data.competency?.score}
          hint={
            data.competency?.score == null
              ? 'Menunggu komponen penilaian lengkap'
              : 'Skor akhir · skala 0–100'
          }
        />
      </div>
      <Panel
        title="Pelatihan & penghargaan"
        description="Hanya bukti terverifikasi pada periode terpilih yang berkontribusi ke skor."
      >
        <div className="review-evidence-summary">
          <span>
            <strong>{number(hours)}</strong> jam pelatihan terverifikasi
          </span>
          <span>
            <strong>{awards}</strong> penghargaan terverifikasi
          </span>
        </div>
        {data.evidence.length ? (
          <ul className="review-evidence-list">
            {data.evidence.map((item) => (
              <li key={`${item.kind}/${item.id}`}>
                <div className="review-evidence-heading">
                  <h3>{item.name}</h3>
                  <Badge tone={item.verified ? 'green' : 'orange'}>
                    {item.verified ? 'Terverifikasi' : 'Menunggu verifikasi'}
                  </Badge>
                </div>
                <p>
                  {item.kind === 'training' ? 'Pelatihan' : 'Penghargaan'} · {item.activity_type} ·{' '}
                  {date(item.activity_date)}
                </p>
                <p>
                  {item.organizer}
                  {item.kind === 'training' ? ` · ${number(item.hours)} jam` : ''}
                </p>
                {item.kind === 'training' && (
                  <p>
                    Kesesuaian dengan pekerjaan ·{' '}
                    {item.job_match == null
                      ? 'Belum dinilai'
                      : item.job_match
                        ? 'Sesuai (10 poin)'
                        : 'Tidak sesuai (0 poin)'}
                  </p>
                )}
                <EvidenceFile id={item.document_id} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="Belum ada bukti kegiatan"
            description="Belum ada pelatihan atau penghargaan pada periode ini."
          />
        )}
        <p className="review-footnote">
          Target pelatihan {number(data.config.training_hours_target)} jam; setiap penghargaan
          terverifikasi menambah {number(data.config.achievement_points)} poin. Skor bukti dibatasi
          100.
        </p>
      </Panel>
      <Panel
        title="Rincian penilaian Ketua Tim"
        description="Indikator dan catatan setiap penilai. Draft belum berkontribusi ke skor akhir."
      >
        {data.leaders.length ? (
          data.leaders.map((leader) => (
            <section
              className="review-leader"
              key={leader.id}
              aria-label={`Penilaian oleh ${leader.leader_name}`}
            >
              <div className="review-evidence-heading">
                <h3>{leader.leader_name}</h3>
                <Badge tone={leader.submitted_at ? 'green' : 'orange'}>
                  {leader.submitted_at ? 'Terkirim' : 'Draft'}
                </Badge>
              </div>
              <dl className="detail-list">
                {Object.entries(leader.indicators).map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{number(value)} / 100</dd>
                  </div>
                ))}
                <div>
                  <dt>Rata-rata indikator{leader.submitted_at ? '' : ' (draft)'}</dt>
                  <dd>{number(leader.score)}</dd>
                </div>
              </dl>
              {leader.note && (
                <div className="review-leader-note">
                  <strong>Catatan Ketua Tim</strong>
                  <p>{leader.note}</p>
                </div>
              )}
              <p className="muted">
                {leader.submitted_at
                  ? `Dikirim ${date(leader.submitted_at)}`
                  : 'Penilaian ini belum dikirim.'}
              </p>
            </section>
          ))
        ) : (
          <Empty
            title="Belum ada penilaian Ketua Tim"
            description="Penilaian akan tampil setelah Ketua Tim menyimpan draft atau mengirim penilaian."
          />
        )}
      </Panel>
    </>
  );
}
