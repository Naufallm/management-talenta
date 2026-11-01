import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Download, Pencil, ArrowUpRight } from 'lucide-react';
import { useApi, useAuth, usePeriod } from '../lib/context';
import { api, post, put } from '../lib/api';
import {
  PageHeader,
  Panel,
  State,
  Empty,
  Button,
  Badge,
  Form,
  Field,
  Dialog,
  number,
  string,
  useFeedback,
  Pagination,
} from '../components/ui';
import { TalentChart, CkpChart } from '../components/Charts';
import { Metric } from './Employees';
import { EmployeeSelect } from '../components/EmployeeSelect';
import type { TalentPoint, ScoreConfig } from '../../shared/contracts';
import { months } from '../../shared/constants';
export function Talent() {
  const { period } = usePeriod(),
    { user } = useAuth(),
    isManager = user?.role !== 'PEGAWAI',
    [team, setTeam] = useState(''),
    [quadrant, setQuadrant] = useState('');
  const state = useApi<TalentPoint[]>(
      period
        ? `/talent/${period.id}?team=${encodeURIComponent(team)}&quadrant=${encodeURIComponent(quadrant)}`
        : null,
    ),
    config = useApi<ScoreConfig>(period ? `/periods/${period.id}/config` : null),
    teams = useApi(isManager && period ? `/teams?year=${period.year}` : null);
  return (
    <>
      <PageHeader
        title={isManager ? 'Peta Talenta' : 'Peta Talenta Saya'}
        description="Pemetaan potensi (X) dan kompetensi (Y) pada rentang 0–100."
      />
      <Panel
        title="Matriks potensi × kompetensi"
        description={`Ambang potensi ${config.data?.potential_threshold ?? '—'} · Ambang kompetensi ${config.data?.competency_threshold ?? '—'}`}
        actions={<Badge>{state.data?.length || 0} posisi</Badge>}
      >
        {isManager && (
          <div className="toolbar">
            <select aria-label="Filter tim" value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">Semua tim</option>
              {teams.data?.teams.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter kuadran"
              value={quadrant}
              onChange={(e) => setQuadrant(e.target.value)}
            >
              <option value="">Semua kuadran</option>
              {[
                'Talenta Unggul',
                'Profesional Andal',
                'Perlu Pengembangan',
                'Talenta Berkembang',
              ].map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </div>
        )}
        <State
          loading={state.loading || config.loading}
          error={state.error || config.error}
          retry={state.refresh}
        >
          {state.data && config.data && (
            <TalentChart points={state.data} config={config.data} self={!isManager} />
          )}
        </State>
      </Panel>
      <Panel
        title="Rincian posisi"
        description="Pilih nama untuk membuka sumber dan riwayat penilaiannya."
      >
        {state.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pegawai</th>
                  <th>Unit</th>
                  <th>Potensi (X)</th>
                  <th>Kompetensi (Y)</th>
                  <th>Kuadran</th>
                  <th>
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((r) => (
                  <tr key={r.employee_id}>
                    <td>
                      <Link
                        className="person-link"
                        to={isManager ? `/pegawai/${r.employee_id}` : '/profil'}
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td>{r.unit}</td>
                    <td>{number(r.potential)}</td>
                    <td>{number(r.competency)}</td>
                    <td>
                      <Badge
                        tone={
                          r.quadrant === 'Talenta Unggul'
                            ? 'green'
                            : r.quadrant === 'Talenta Berkembang'
                              ? 'orange'
                              : 'blue'
                        }
                      >
                        {r.quadrant}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        className="icon-link"
                        to={
                          isManager
                            ? `/pegawai/${r.employee_id}?tab=riwayat`
                            : '/profil?tab=riwayat'
                        }
                        aria-label={`Riwayat ${r.name}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Belum ada posisi yang dapat ditampilkan"
            description="Pegawai tanpa skor potensi dan kompetensi lengkap tidak ditempatkan pada kuadran."
          />
        )}
      </Panel>
      {!isManager && (
        <Link className="text-link" to="/profil?tab=riwayat">
          Lihat riwayat kuadran saya →
        </Link>
      )}
    </>
  );
}
export function Ckp() {
  const { period } = usePeriod(),
    { user } = useAuth(),
    isManager = user?.role !== 'PEGAWAI',
    [employeeId, setEmployeeId] = useState(''),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<any>(null),
    [importing, setImporting] = useState(false),
    { notify } = useFeedback();
  const state = useApi(
      period
        ? `/ckp?year=${period.year}&employee_id=${encodeURIComponent(employeeId)}&page=${page}&limit=12`
        : null,
    ),
    trend = state.data?.trend || [],
    nonempty = trend.filter((r: any) => r.score !== null),
    last = nonempty.at(-1),
    previous = nonempty.at(-2);
  useEffect(() => setPage(1), [period?.id, employeeId]);
  return (
    <>
      <PageHeader
        title={isManager ? 'Kinerja CKP' : 'Kinerja CKP Saya'}
        description={`Capaian kinerja bulanan · Tahun ${period?.year || '—'}`}
        actions={
          user?.role === 'ADMIN' && (
            <>
              <Button variant="secondary" onClick={() => setImporting(true)}>
                <Upload size={16} />
                Impor CKP
              </Button>
              <Button onClick={() => setEditing({})}>
                <Plus size={16} />
                Input CKP
              </Button>
            </>
          )
        }
      />
      {isManager && (
        <Panel className="filter-panel">
          <Field label="Filter pegawai">
            <EmployeeSelect value={employeeId} onChange={setEmployeeId} required={false} allowAll />
          </Field>
        </Panel>
      )}
      <State {...state} retry={state.refresh}>
        <div className="metric-grid three">
          <Metric
            label="Rata-rata tahunan"
            value={number(state.data?.average)}
            hint={`${nonempty.length} bulan memiliki data`}
          />
          <Metric
            label="Bulan terakhir tercatat"
            value={last ? months[last.month - 1] : '—'}
            hint={last ? `Skor rata-rata ${number(last.score)}` : 'Belum ada nilai'}
          />
          <Metric
            label="Perubahan antarbulan"
            value={
              last && previous
                ? `${last.score - previous.score >= 0 ? '+' : ''}${number(last.score - previous.score)}`
                : '—'
            }
            hint={
              last && previous
                ? `${months[previous.month - 1]} → ${months[last.month - 1]}`
                : 'Perlu minimal dua bulan data'
            }
          />
        </div>
        <Panel title="Tren CKP 12 bulan" description="Bulan tanpa nilai dibiarkan kosong.">
          <CkpChart trend={trend} />
        </Panel>
        <Panel title="Rincian nilai bulanan">
          {state.data?.rows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {isManager && <th>Pegawai</th>}
                    <th>Bulan</th>
                    <th>Tahun</th>
                    <th>Skor CKP</th>
                    {user?.role === 'ADMIN' && <th>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {state.data.rows.map((r: any) => (
                    <tr key={r.id}>
                      {isManager && (
                        <td>
                          <strong>{r.name}</strong>
                          <small className="mono">{r.nip}</small>
                        </td>
                      )}
                      <td>{months[r.month - 1]}</td>
                      <td>{r.year}</td>
                      <td>
                        <strong>{number(r.score)}</strong>
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td>
                          <Button
                            variant="ghost"
                            aria-label={`Edit CKP ${r.name} ${months[r.month - 1]}`}
                            onClick={() => setEditing(r)}
                          >
                            <Pencil size={16} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Nilai CKP belum tersedia"
              description="Nilai akan tampil setelah diinput atau diimpor oleh Admin."
            />
          )}
          {state.data && (
            <Pagination page={page} total={state.data.total} limit={12} onPage={setPage} />
          )}
        </Panel>
      </State>
      {editing && period && (
        <Dialog
          title={editing.id ? 'Edit CKP' : 'Input CKP bulanan'}
          onClose={() => setEditing(null)}
        >
          <Form
            submit="Simpan CKP"
            cancel={() => setEditing(null)}
            onSubmit={async (d) => {
              const body = {
                employee_id: editing.employee_id || string(d, 'employee_id'),
                year: Number(d.get('year')),
                month: Number(d.get('month')),
                score: Number(d.get('score')),
              };
              if (editing.id) await put(`/ckp/${editing.id}`, body);
              else await post('/ckp', body);
              setEditing(null);
              state.refresh();
              notify('Nilai CKP disimpan.');
            }}
          >
            {editing.employee_id ? (
              <p>
                <strong>{editing.name}</strong>
              </p>
            ) : (
              <Field label="Pegawai">
                <EmployeeSelect />
              </Field>
            )}
            <div className="form-grid">
              <Field label="Bulan">
                <select name="month" defaultValue={editing.month || 1}>
                  {months.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tahun">
                <input
                  type="number"
                  name="year"
                  min="2020"
                  max="2100"
                  required
                  defaultValue={editing.year || period.year}
                />
              </Field>
            </div>
            <Field label="Skor CKP (0–100)">
              <input
                type="number"
                name="score"
                min="0"
                max="100"
                step="0.01"
                defaultValue={editing.score ?? ''}
                required
              />
            </Field>
          </Form>
        </Dialog>
      )}
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            state.refresh();
          }}
        />
      )}
    </>
  );
}
function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null),
    [rows, setRows] = useState<any[] | null>(null),
    { run, notify } = useFeedback(),
    [busy, setBusy] = useState(false);
  async function send(action: string) {
    if (!file) return;
    setBusy(true);
    try {
      const d = new FormData();
      d.append('file', file);
      d.append('action', action);
      const result = await api('/ckp/import', { method: 'POST', body: d });
      if (action === 'commit') {
        notify(result.message);
        onDone();
      } else setRows(result.rows);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Impor CKP" onClose={() => !busy && onClose()}>
      <p>
        Gunakan CSV atau Excel (.xlsx), maksimal 2 MB dan 5.000 baris. Header wajib:{' '}
        <code>nip,bulan,tahun,skor</code>. Format kolom NIP sebagai teks agar 18 angka tetap utuh.
      </p>
      <a
        className="text-link"
        download="template-ckp.csv"
        href={'data:text/csv;charset=utf-8,' + encodeURIComponent('nip,bulan,tahun,skor\r\n')}
      >
        Unduh template CSV
        <Download size={14} />
      </a>
      <Field label="Berkas CKP">
        <input
          type="file"
          accept=".csv,.xlsx"
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setRows(null);
          }}
        />
      </Field>
      {rows && (
        <>
          <p>
            <Badge tone={rows.some((r) => r.error) ? 'orange' : 'green'}>
              {rows.filter((r) => !r.error).length} valid · {rows.filter((r) => r.error).length}{' '}
              bermasalah
            </Badge>
          </p>
          <div className="table-wrap import-preview">
            <table>
              <thead>
                <tr>
                  <th>Baris</th>
                  <th>Pegawai / NIP</th>
                  <th>Bulan</th>
                  <th>Skor</th>
                  <th>Validasi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>{r.name || r.nip}</td>
                    <td>
                      {r.month}/{r.year}
                    </td>
                    <td>{r.score}</td>
                    <td className={r.error ? 'error-text' : ''}>{r.error || 'Valid'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="form-actions">
        <Button
          variant="secondary"
          disabled={!file || busy}
          onClick={() => void run(() => send('preview'))}
        >
          {busy ? 'Memproses…' : 'Validasi berkas'}
        </Button>
        <Button
          disabled={!rows || rows.some((r) => r.error) || busy}
          onClick={() => void run(() => send('commit'))}
        >
          Simpan seluruh data
        </Button>
      </div>
    </Dialog>
  );
}
export function Reports() {
  const { period } = usePeriod(),
    [page, setPage] = useState(1),
    state = useApi(period ? `/reports/${period.id}?page=${page}&limit=20` : null);
  useEffect(() => setPage(1), [period?.id]);
  return (
    <>
      <PageHeader
        title="Laporan Talenta"
        description="Rekap potensi, kompetensi, kuadran, dan CKP tanpa data psikologi."
        actions={
          period && (
            <a className="btn btn-primary" href={`/api/reports/${period.id}?format=csv`}>
              <Download size={16} />
              Ekspor CSV
            </a>
          )
        }
      />
      <Panel title={`Rekap tahun ${period?.year || '—'}`}>
        <State {...state} retry={state.refresh}>
          {state.data?.rows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pegawai / NIP</th>
                    <th>Unit</th>
                    <th>Potensi</th>
                    <th>Kompetensi</th>
                    <th>Kuadran</th>
                    <th>CKP rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.rows.map((r: any) => (
                    <tr key={r.nip}>
                      <td>
                        <strong>{r.name}</strong>
                        <small className="mono">{r.nip}</small>
                      </td>
                      <td>{r.unit}</td>
                      <td>{number(r.potential)}</td>
                      <td>{number(r.competency)}</td>
                      <td>{r.quadrant || 'Belum tersedia'}</td>
                      <td>{number(r.ckp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
          {state.data && (
            <Pagination page={page} total={state.data.total} limit={20} onPage={setPage} />
          )}
        </State>
      </Panel>
    </>
  );
}
