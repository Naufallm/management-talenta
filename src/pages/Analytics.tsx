import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Download, Eye } from 'lucide-react';
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
import { TalentChart, CkpComparisonChart } from '../components/Charts';
import { Metric } from './Employees';
import { EmployeeSelect } from '../components/EmployeeSelect';
import type { TalentPoint, ScoreConfig } from '../../shared/contracts';
import { months, quadrantLabels } from '../../shared/constants';
import type { CkpEmployeeTrend } from '../../shared/ckp';
import { CkpEmployeeFilter } from '../components/CkpEmployeeFilter';
import { FilterBar } from '../components/FilterBar';
import { TransitionState } from '../components/TransitionState';
const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
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
      { keepPreviousData: true },
    ),
    config = useApi<ScoreConfig>(period ? `/periods/${period.id}/config` : null, {
      keepPreviousData: true,
    }),
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
          <FilterBar label="Filter peta talenta">
            <Field label="Tim">
              <select
                aria-label="Filter tim"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              >
                <option value="">Semua tim</option>
                {teams.data?.teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kuadran">
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
            </Field>
          </FilterBar>
        )}
        <TransitionState
          data={state.data && config.data ? state.data : null}
          loading={state.loading || config.loading}
          error={state.error || config.error}
          retry={state.refresh}
        >
          {state.data && config.data && (
            <TalentChart points={state.data} config={config.data} self={!isManager} />
          )}
        </TransitionState>
      </Panel>
      <Panel
        title="Rincian posisi"
        description="Pilih nama untuk membuka sumber dan riwayat penilaiannya."
      >
        <TransitionState {...state} retry={state.refresh}>
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
                          {quadrantLabels[r.quadrant] || r.quadrant}
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
                          title={`Lihat riwayat ${r.name}`}
                        >
                          <Eye size={17} aria-hidden="true" />
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
        </TransitionState>
      </Panel>
      {!isManager && (
        <Link className="text-link" to="/profil?tab=riwayat">
          Lihat riwayat kuadran saya <Eye size={15} aria-hidden="true" />
        </Link>
      )}
    </>
  );
}
export function Ckp() {
  const { period, periods, setPeriod } = usePeriod(),
    { user } = useAuth(),
    isManager = user?.role !== 'PEGAWAI',
    [employeeId, setEmployeeId] = useState(''),
    [selectedEmployees, setSelectedEmployees] = useState<string[]>([]),
    [tableMonth, setTableMonth] = useState(0),
    [tableYear, setTableYear] = useState<number | null>(null),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<any>(null),
    [importing, setImporting] = useState(false),
    [editingYear, setEditingYear] = useState<any>(null),
    { notify } = useFeedback();
  const state = useApi(
    period
      ? `/ckp/matrix?year=${tableYear ?? period.year}&month=${tableMonth}&employee_id=${encodeURIComponent(employeeId)}&page=${page}&limit=8`
      : null,
    { keepPreviousData: true },
  );
  const history = useApi<{ employees: CkpEmployeeTrend[] }>(
    period ? `/ckp/trends?year=${period.year}` : null,
    { keepPreviousData: true },
  );
  const employees = history.data?.employees || [];
  const canEditTable =
    user?.role === 'ADMIN' &&
    !periods.some((p) => p.year === (tableYear ?? period?.year) && p.status === 'CLOSED');
  const selectedSeries = useMemo(
    () =>
      selectedEmployees.length
        ? employees.filter((employee) => selectedEmployees.includes(employee.employee_id))
        : employees,
    [employees, selectedEmployees],
  );
  const trend = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        score: mean(
          selectedSeries
            .map((employee) => employee.trend[index].score)
            .filter((value): value is number => value !== null),
        ),
      })),
    [selectedSeries],
  );
  const average = mean(
    selectedSeries.flatMap((employee) =>
      employee.trend.map((point) => point.score).filter((value): value is number => value !== null),
    ),
  );
  const nonempty = trend.filter((r) => r.score !== null),
    last = nonempty.at(-1),
    previous = nonempty.at(-2);
  useEffect(() => {
    if (tableYear === null && period) setTableYear(period.year);
  }, [period, tableYear]);
  useEffect(() => setPage(1), [tableYear, tableMonth, employeeId]);
  return (
    <>
      <PageHeader
        title="Capaian Kinerja Pegawai"
        description={`${isManager ? 'Capaian kinerja bulanan' : 'Capaian kinerja bulanan Anda'} · Tahun ${period?.year || '—'}`}
        actions={
          user?.role === 'ADMIN' &&
          period?.status === 'OPEN' && (
            <>
              <Button variant="secondary" onClick={() => setImporting(true)}>
                <Upload size={16} />
                Impor Capaian Kinerja Pegawai
              </Button>
              <Button onClick={() => setEditing({})}>
                <Plus size={16} />
                Input Capaian Kinerja Pegawai
              </Button>
            </>
          )
        }
      />
      <TransitionState
        {...history}
        retry={history.refresh}
        transitionKey={selectedEmployees.join(',')}
      >
        <div className="metric-grid three">
          <Metric
            label={selectedEmployees.length ? 'Rata-rata pegawai terpilih' : 'Rata-rata tahunan'}
            value={number(average)}
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
                ? `${last.score! - previous.score! >= 0 ? '+' : ''}${number(last.score! - previous.score!)}`
                : '—'
            }
            hint={
              last && previous
                ? `${months[previous.month - 1]} → ${months[last.month - 1]}`
                : 'Perlu minimal dua bulan data'
            }
          />
        </div>
      </TransitionState>
      <div className="ckp-charts-grid">
        <Panel
          title="Tren Capaian Kinerja Pegawai 12 bulan"
          description={`${selectedEmployees.length ? 'Perbandingan garis setiap pegawai terpilih' : 'Rata-rata Capaian Kinerja Pegawai bulanan'} · Tahun ${period?.year || '—'}. Bulan tanpa nilai dibiarkan kosong.`}
        >
          <div className={`ckp-trend-workspace${isManager ? ' has-controls' : ''}`}>
            {isManager && (
              <aside className="ckp-trend-controls" aria-label="Pilihan perbandingan kinerja">
                <FilterBar label="Filter grafik garis" className="ckp-main-filters">
                  <Field label="Periode grafik garis">
                    <select
                      value={period?.id || ''}
                      onChange={(event) => setPeriod(event.target.value)}
                    >
                      {periods.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.year} · {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <TransitionState {...history} retry={history.refresh}>
                    <CkpEmployeeFilter
                      employees={employees}
                      selected={selectedEmployees}
                      onChange={setSelectedEmployees}
                    />
                  </TransitionState>
                </FilterBar>
              </aside>
            )}
            <div className="ckp-trend-plot">
              <TransitionState {...history} retry={history.refresh}>
                <CkpComparisonChart
                  employees={employees}
                  selected={selectedEmployees}
                  average={trend}
                />
              </TransitionState>
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="Rincian nilai bulanan"
        className="ckp-monthly-details"
        description="Filter rincian berlaku khusus untuk tabel ini, terpisah dari pilihan grafik."
        actions={
          period && (
            <a
              className="btn btn-secondary"
              href={`/api/ckp/matrix?format=csv&year=${tableYear ?? period.year}&month=${tableMonth}&employee_id=${encodeURIComponent(employeeId)}`}
            >
              <Download size={16} aria-hidden="true" />
              Unduh hasil CSV
            </a>
          )
        }
      >
        <FilterBar label="Filter rincian bulanan" className="ckp-table-filters">
          {isManager && (
            <Field label="Pegawai rincian bulanan">
              <EmployeeSelect
                value={employeeId}
                onChange={setEmployeeId}
                required={false}
                allowAll
              />
            </Field>
          )}
          <Field label="Bulan rincian bulanan">
            <select
              value={tableMonth}
              onChange={(event) => setTableMonth(Number(event.target.value))}
            >
              <option value={0}>Semua bulan</option>
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tahun rincian bulanan">
            <select
              value={tableYear ?? period?.year ?? ''}
              onChange={(event) => setTableYear(Number(event.target.value))}
            >
              {periods.map((item) => (
                <option key={item.id} value={item.year}>
                  {item.year}
                </option>
              ))}
            </select>
          </Field>
        </FilterBar>
        <TransitionState {...state} retry={state.refresh}>
          {state.data?.rows.length ? (
            <div className="table-wrap ckp-matrix-wrap">
              <table className="ckp-matrix">
                <thead>
                  <tr>
                    <th>Pegawai</th>
                    {(tableMonth ? [tableMonth] : months.map((_, index) => index + 1)).map(
                      (value) => (
                        <th key={value}>{months[value - 1]}</th>
                      ),
                    )}
                    {canEditTable && <th className="ckp-row-action">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {state.data.rows.map((row: any) => (
                    <tr key={row.employee_id}>
                      <td>
                        <strong>{row.name}</strong>
                        <small className="mono">{row.nip}</small>
                      </td>
                      {(tableMonth ? [tableMonth] : months.map((_, index) => index + 1)).map(
                        (value) => {
                          const cell = row.values[value];
                          return (
                            <td key={value}>
                              {cell ? (
                                <strong>{number(cell.score)}</strong>
                              ) : (
                                <span className="muted" aria-label="Belum ada nilai">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        },
                      )}
                      {canEditTable && (
                        <td className="ckp-row-action">
                          <Button
                            variant="secondary"
                            aria-label={`Edit CKP ${row.name}`}
                            onClick={() =>
                              setEditingYear({ ...row, year: tableYear ?? period?.year })
                            }
                          >
                            Edit
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
              title="Nilai Capaian Kinerja Pegawai belum tersedia"
              description="Nilai akan tampil setelah diinput atau diimpor oleh Admin."
            />
          )}
          {state.data && (
            <Pagination page={page} total={state.data.total} limit={8} onPage={setPage} />
          )}
        </TransitionState>
      </Panel>
      {editingYear && (
        <CkpYearDialog
          employee={editingYear}
          onClose={() => setEditingYear(null)}
          onSaved={() => {
            setEditingYear(null);
            state.refresh();
            history.refresh();
            notify('Nilai CKP tahunan disimpan.');
          }}
        />
      )}
      {editing && period && (
        <Dialog
          title={
            editing.id ? 'Edit Capaian Kinerja Pegawai' : 'Input Capaian Kinerja Pegawai bulanan'
          }
          onClose={() => setEditing(null)}
        >
          <Form
            submit="Simpan Capaian Kinerja Pegawai"
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
              history.refresh();
              notify('Nilai Capaian Kinerja Pegawai disimpan.');
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
            <Field label="Nilai kinerja (0–100)">
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
      {importing && period && (
        <ImportDialog
          initialYear={tableYear ?? period.year}
          initialMonth={tableMonth || 1}
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            state.refresh();
            history.refresh();
          }}
        />
      )}
    </>
  );
}
function CkpYearDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const state = useApi(
    `/ckp/matrix?year=${employee.year}&employee_id=${encodeURIComponent(employee.employee_id)}&limit=1`,
  );
  const values = state.data?.rows[0]?.values || {};
  return (
    <Dialog title={`Edit CKP - ${employee.name}`} onClose={onClose}>
      <p className="muted">
        Tahun {employee.year}. Nilai kosong berarti belum ada capaian; mengosongkan nilai yang sudah
        terisi akan menghapus nilai bulan tersebut.
      </p>
      <State {...state} retry={state.refresh}>
        {state.data && (
          <Form
            cancel={onClose}
            submit="Simpan nilai tahunan"
            onSubmit={async (d) => {
              await put('/ckp/yearly', {
                employee_id: employee.employee_id,
                year: employee.year,
                values: months.map((_, index) => ({
                  month: index + 1,
                  score:
                    string(d, 'month_' + index) === '' ? null : Number(d.get('month_' + index)),
                })),
              });
              onSaved();
            }}
          >
            <div className="form-grid ckp-year-fields">
              {months.map((name, index) => (
                <Field label={name} key={name}>
                  <input
                    name={'month_' + index}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue={values[index + 1]?.score ?? ''}
                    placeholder="Belum ada nilai"
                  />
                </Field>
              ))}
            </div>
          </Form>
        )}
      </State>
    </Dialog>
  );
}
function ImportDialog({
  onClose,
  onDone,
  initialYear,
  initialMonth,
}: {
  onClose: () => void;
  onDone: () => void;
  initialYear: number;
  initialMonth: number;
}) {
  const [file, setFile] = useState<File | null>(null),
    [rows, setRows] = useState<any[] | null>(null),
    [templateYear, setTemplateYear] = useState(initialYear),
    [templateMonth, setTemplateMonth] = useState(initialMonth),
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
    <Dialog title="Impor Capaian Kinerja Pegawai" onClose={() => !busy && onClose()}>
      <p>
        Unduh template Excel yang sudah berisi NIP dan nama seluruh pegawai aktif. Isi kolom Skor
        berwarna kuning dengan nilai 0–100, simpan, lalu unggah kembali. Baris tanpa skor pada
        template dilewati; nilai 0 tetap diimpor.
      </p>
      <div className="form-grid">
        <Field label="Bulan template">
          <select
            value={templateMonth}
            onChange={(event) => setTemplateMonth(Number(event.target.value))}
            disabled={busy}
          >
            {months.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tahun template">
          <input
            type="number"
            min="2020"
            max="2100"
            value={templateYear}
            onChange={(event) => setTemplateYear(Number(event.target.value))}
            disabled={busy}
          />
        </Field>
      </div>
      <a
        className="btn btn-secondary"
        href={
          templateYear >= 2020 && templateYear <= 2100 && Number.isInteger(templateYear)
            ? `/api/ckp/template?year=${templateYear}&month=${templateMonth}`
            : undefined
        }
        aria-disabled={
          templateYear < 2020 || templateYear > 2100 || !Number.isInteger(templateYear)
        }
      >
        <Download size={16} aria-hidden="true" />
        Unduh template Excel
      </a>
      <p className="muted">
        Excel (.xlsx) atau CSV, maksimal 2 MB dan 5.000 baris. Pertahankan header template dan
        format NIP sebagai teks. Format CSV lama <code>nip,bulan,tahun,skor</code> juga didukung.
        Data yang sudah ada ditolak sebagai duplikat; gunakan aksi edit untuk memperbaruinya.
      </p>
      <Field label="Berkas Capaian Kinerja Pegawai">
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
        description="Rekap potensi, kompetensi, kuadran, dan Capaian Kinerja Pegawai tanpa data psikologi."
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
                    <th>Rata-rata kinerja</th>
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
