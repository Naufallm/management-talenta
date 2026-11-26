import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApi, useAuth, usePeriod } from '../lib/context';
import {
  PageHeader,
  Panel,
  State,
  Empty,
  Field,
  Badge,
  date,
  number,
  Button,
} from '../components/ui';
import { CompetencyEvidence } from '../components/CompetencyEvidence';
import { Education } from '../components/Education';
import { EmployeeDnaReview } from '../components/DnaResults';
import { NineBoxInputDialog } from '../components/NineBoxForms';
import { ScoreBreakdown } from '../components/NineBoxMatrix';
import type { ComponentKey, NineBoxResponse } from '../../shared/nine-box';
import '../components/NineBox.css';
type Kind = 'training' | 'awards' | 'education' | 'experience' | 'dna' | 'leader' | 'relevance';
const componentKey: Record<Kind, ComponentKey> = {
  training: 'training',
  awards: 'awards',
  education: 'education',
  experience: 'experience',
  dna: 'assessment',
  leader: 'leader',
  relevance: 'field_match',
};
const titles: Record<Kind, string> = {
  training: 'Pelatihan / Diklat',
  awards: 'Penghargaan',
  education: 'Pendidikan Formal',
  experience: 'Pengalaman Jabatan',
  dna: 'Asesmen dan Profil DNA',
  leader: 'Penilaian Ketua Tim',
  relevance: 'Kesesuaian Bidang Ilmu',
};
export function NineBoxRecords({ kind, embedded = false }: { kind: Kind; embedded?: boolean }) {
  const { period } = usePeriod(),
    { user } = useAuth(),
    manager = user?.role !== 'PEGAWAI',
    admin = user?.role === 'ADMIN';
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const dataset = useApi<NineBoxResponse>(period ? `/nine-box/${period.id}` : null);
  const row =
    dataset.data?.rows.find((r) => r.employee_id === params.get('pegawai')) ||
    dataset.data?.rows[0];
  const detail = useApi(row ? `/employees/${row.employee_id}` : null);
  const context = useApi(row && period ? `/nine-box/${period.id}/inputs/${row.employee_id}` : null);
  const employee = detail.data?.employee;
  const refresh = () => {
    detail.refresh();
    context.refresh();
    dataset.refresh();
  };
  return (
    <div className="nine-box-page">
      {!embedded && (
        <PageHeader
          title={titles[kind]}
          description={`Data pendukung penilaian tahun ${period?.year || ''}.`}
          actions={
            admin && row && kind === 'education' && period?.status === 'OPEN' ? (
              <Button onClick={() => setEditing(true)}>Konfirmasi kualifikasi</Button>
            ) : undefined
          }
        />
      )}
      {embedded && admin && row && kind === 'education' && period?.status === 'OPEN' && (
        <div className="section-toolbar">
          <Button onClick={() => setEditing(true)}>Konfirmasi kualifikasi</Button>
        </div>
      )}
      {manager && (
        <Panel>
          <Field label="Pegawai">
            <select
              aria-label="Pegawai data pendukung"
              value={row?.employee_id || ''}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                next.set('pegawai', e.target.value);
                setParams(next);
              }}
            >
              {dataset.data?.rows.map((r) => (
                <option key={r.employee_id} value={r.employee_id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </Panel>
      )}
      <State {...dataset} retry={dataset.refresh}>
        <State {...detail} retry={detail.refresh}>
          {employee && row && (
            <>
              <Panel title={employee.name} description={`${employee.nip} - ${employee.position}`}>
                <ScoreBreakdown row={row} componentKeys={[componentKey[kind]]} />
              </Panel>
              {['training', 'awards'].includes(kind) && (
                <CompetencyEvidence
                  key={employee.id + '/' + period?.id}
                  employee={employee}
                  period={period}
                  rows={detail.data.evidence}
                  only={kind === 'training' ? 'training' : 'achievement'}
                  onSaved={refresh}
                />
              )}{' '}
              {kind === 'education' && (
                <Education
                  employee={employee}
                  editable={admin || user?.employee_id === employee.id}
                />
              )}{' '}
              {kind === 'dna' && period && (
                <EmployeeDnaReview
                  key={employee.id + '/' + period.id}
                  employeeId={employee.id}
                  periodId={period.id}
                />
              )}{' '}
              {['experience', 'leader', 'relevance'].includes(kind) && (
                <State {...context} retry={context.refresh}>
                  {context.data && (
                    <Panel
                      title={titles[kind]}
                      description={
                        kind === 'experience'
                          ? 'Peran tertinggi pada tahun terpilih: ketua 20 poin atau anggota 5 poin.'
                          : kind === 'leader'
                            ? 'Rata-rata nilai yang telah dikirim; bobot 15% sumbu Y.'
                            : 'Setiap pelatihan sesuai bernilai 10 poin. Setelah seluruh pelatihan terverifikasi dinilai, rata-ratanya menyumbang maksimal 15% pada sumbu X.'
                      }
                    >
                      {kind === 'experience' ? (
                        <>
                          {context.data.teams.length ? (
                            <div className="table-wrap">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Tim</th>
                                    <th>Peran</th>
                                    <th>Poin</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {context.data.teams.map((t: any) => (
                                    <tr key={t.name}>
                                      <td>{t.name}</td>
                                      <td>
                                        <Badge tone={t.is_leader ? 'blue' : 'neutral'}>
                                          {t.is_leader ? 'Ketua tim' : 'Anggota'}
                                        </Badge>
                                      </td>
                                      <td>{t.is_leader ? 20 : 5}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <Empty title="Belum ada penugasan tim" />
                          )}
                          {admin && (
                            <Link className="btn btn-secondary" to="/tim">
                              Kelola struktur tim
                            </Link>
                          )}
                        </>
                      ) : kind === 'leader' ? (
                        <>
                          {context.data.leaders.length ? (
                            <div className="table-wrap">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Penilai</th>
                                    <th>Nilai</th>
                                    <th>Tanggal dikirim</th>
                                    <th>Catatan</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {context.data.leaders.map((l: any) => (
                                    <tr key={l.id}>
                                      <td>{l.leader_name}</td>
                                      <td>{number(l.score)}</td>
                                      <td>{date(l.submitted_at)}</td>
                                      <td>{l.note || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <Empty
                              title="Belum ada penilaian terkirim"
                              description="Ketua tim mengisi dan mengirim penilaian anggota pada periode ini."
                            />
                          )}
                          {user?.is_leader && user.role === 'PEGAWAI' && (
                            <Link className="btn btn-secondary" to="/penilaian-anggota">
                              Nilai anggota tim
                            </Link>
                          )}
                        </>
                      ) : (
                        <>
                          {context.data.input.field_match != null && (
                            <p>
                              Nilai historis pada periode ini:{' '}
                              {context.data.input.field_match ? '10' : '0'} poin. Nilai historis
                              digunakan sampai ada penilaian individual pada pelatihan terverifikasi
                              yang sudah berlangsung.
                            </p>
                          )}
                          <CompetencyEvidence
                            employee={employee}
                            period={period}
                            rows={detail.data.evidence}
                            only="training"
                            onSaved={refresh}
                          />
                        </>
                      )}
                    </Panel>
                  )}
                </State>
              )}
            </>
          )}
        </State>
      </State>
      {editing && row && dataset.data && (
        <NineBoxInputDialog
          row={row}
          config={dataset.data.config}
          onClose={() => setEditing(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

export function PotentialSectionPage({ section }: { section: 'competency' | 'qualification' }) {
  const [params, setParams] = useSearchParams();
  const competency = section === 'competency';
  const items = competency
    ? [
        {
          id: 'pelatihan',
          kind: 'training' as const,
          title: 'Pelatihan / Diklat',
          description: 'Pengembangan kompetensi',
          weight: '30%',
        },
        {
          id: 'pengalaman',
          kind: 'experience' as const,
          title: 'Pengalaman Jabatan',
          description: 'Peran dan penugasan tim',
          weight: '10%',
        },
      ]
    : [
        {
          id: 'pendidikan',
          kind: 'education' as const,
          title: 'Pendidikan Formal',
          description: 'Jenjang dan bidang studi',
          weight: '15%',
        },
        {
          id: 'kesesuaian',
          kind: 'relevance' as const,
          title: 'Kesesuaian Bidang Ilmu',
          description: 'Kesesuaian pelatihan dengan pekerjaan',
          weight: '15%',
        },
      ];
  const active = items.find((item) => item.id === params.get('bagian')) || items[0];
  return (
    <div className="nine-box-page section-page">
      <PageHeader
        title={competency ? 'Kompetensi' : 'Kualifikasi'}
        description={
          competency
            ? 'Kembangkan kemampuan melalui pembelajaran dan pengalaman kerja.'
            : 'Riwayat pendidikan dan relevansinya dengan bidang yang digeluti.'
        }
      />
      <div
        className="section-subnav"
        role="tablist"
        aria-label={competency ? 'Rincian kompetensi' : 'Rincian kualifikasi'}
      >
        {items.map((item, i) => (
          <button
            role="tab"
            aria-selected={active.id === item.id}
            tabIndex={active.id === item.id ? 0 : -1}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const index =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : (i + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
              const next = new URLSearchParams(params);
              next.set('bagian', items[index].id);
              setParams(next);
              const tabs =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                );
              tabs?.[index]?.focus();
            }}
            id={'section-tab-' + item.id}
            aria-controls="section-content"
            key={item.id}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('bagian', item.id);
              setParams(next);
            }}
            className={active.id === item.id ? 'active' : ''}
          >
            <span className="section-tab-icon">{i === 0 ? '01' : '02'}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <span className="section-tab-weight">{item.weight}</span>
          </button>
        ))}
      </div>
      <div id="section-content" role="tabpanel" aria-labelledby={'section-tab-' + active.id}>
        <NineBoxRecords key={section + '/' + active.kind} kind={active.kind} embedded />
      </div>
    </div>
  );
}
