import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings2, Download, Pencil, Eye, Search, ArrowRight } from 'lucide-react';
import { useApi, useAuth, usePeriod } from '../lib/context';
import {
  PageHeader,
  Panel,
  State,
  Empty,
  Button,
  Badge,
  Dialog,
  Field,
  number,
  Pagination,
} from '../components/ui';
import {
  NineBoxMatrix,
  BoxPosition,
  BoxGroups,
  ScoreBreakdown,
  BoxScorePanel,
} from '../components/NineBoxMatrix';
import { NineBoxConfigEditor, NineBoxInputDialog } from '../components/NineBoxForms';
import { boxes, boxInfo, type NineBoxResponse, type NineBoxRow } from '../../shared/nine-box';
import '../components/NineBox.css';
const tone = (row: NineBoxRow) =>
  row.box === null
    ? 'neutral'
    : boxInfo(row.box).group === 'succession'
      ? 'green'
      : boxInfo(row.box).group === 'development'
        ? 'orange'
        : 'neutral';
export function NineBoxPage({ dashboard = false }: { dashboard?: boolean }) {
  const { period } = usePeriod(),
    { user } = useAuth(),
    isManager = user?.role !== 'PEGAWAI',
    admin = user?.role === 'ADMIN';
  const [team, setTeam] = useState(''),
    [selected, setSelected] = useState<number | null>(null),
    [q, setQ] = useState(''),
    [page, setPage] = useState(1),
    [detail, setDetail] = useState<NineBoxRow | null>(null),
    [editing, setEditing] = useState<NineBoxRow | null>(null),
    [settings, setSettings] = useState(false);
  const state = useApi<NineBoxResponse>(
    period ? `/nine-box/${period.id}?team=${encodeURIComponent(team)}` : null,
  );
  const teams = useApi(isManager && period ? `/teams?year=${period.year}` : null);
  useEffect(() => {
    setSelected(null);
    setDetail(null);
    setEditing(null);
    setPage(1);
  }, [period?.id]);
  const data = state.data,
    own = data?.rows[0];
  const rows =
    data?.rows.filter(
      (r) =>
        (selected === null || r.box === selected) &&
        `${r.name} ${r.nip} ${r.unit}`.toLowerCase().includes(q.trim().toLowerCase()),
    ) || [];
  const complete = data?.rows.filter((r) => r.box !== null) || [],
    succession = complete.filter((r) => [7, 8, 9].includes(r.box!));
  const avgY = data?.rows.filter((r) => r.y !== null) || [];
  return (
    <div className="nine-box-page">
      <PageHeader
        title={
          dashboard
            ? isManager
              ? 'Dashboard Talenta'
              : `Selamat datang, ${user?.name.split(' ')[0]}.`
            : isManager
              ? 'Matriks 9 Box'
              : 'Posisi Box Saya'
        }
        description={`Pemetaan potensial (X) dan kinerja (Y) - Tahun ${period?.year || ''}`}
        actions={
          <>
            {admin && (
              <Button variant="secondary" onClick={() => setSettings(true)}>
                <Settings2 size={16} />
                Konfigurasi 9 box
              </Button>
            )}
            {isManager && period && (
              <a
                className="btn btn-secondary"
                href={`/api/nine-box/${period.id}/export?${new URLSearchParams({ team, q, ...(selected === null ? {} : { box: String(selected) }) })}`}
              >
                <Download size={16} />
                Ekspor CSV
              </a>
            )}
          </>
        }
      />
      <State {...state} retry={state.refresh}>
        {data && (
          <>
            {isManager ? (
              <>
                <div className="nine-main-layout">
                  <Panel
                    title="Peta Nine Box"
                    description="Pilih box untuk melihat daftar pegawai dan membuka rincian nilai."
                    actions={<Badge tone="blue">{complete.length} posisi</Badge>}
                  >
                    <div className="nine-filter-row">
                      <Field label="Tim">
                        <select
                          aria-label="Filter tim 9 box"
                          value={team}
                          onChange={(e) => {
                            setTeam(e.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="">Semua tim</option>
                          {teams.data?.teams.map((t: any) => (
                            <option value={t.id} key={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {selected !== null && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelected(null);
                            setPage(1);
                          }}
                        >
                          Tampilkan semua box
                        </Button>
                      )}
                    </div>
                    <NineBoxMatrix
                      rows={data.rows}
                      selected={selected}
                      onSelect={(id) => {
                        setSelected(selected === id ? null : id);
                        setPage(1);
                      }}
                      onEmployee={setDetail}
                      config={data.config}
                    />
                  </Panel>
                  <aside>
                    <h2 className="nine-summary-title">Ringkasan penilaian</h2>
                    <div className="nine-kpis">
                      {[
                        ['Pegawai aktif', data.total, 'Sesuai filter tim'],
                        [
                          'Sudah dipetakan',
                          complete.length,
                          `${data.total - complete.length} menunggu kelengkapan`,
                        ],
                        ['Kelompok rencana suksesi', succession.length, 'Box 7, 8, dan 9'],
                        [
                          'Rata-rata kinerja',
                          avgY.length
                            ? number(avgY.reduce((sum, r) => sum + r.y!, 0) / avgY.length)
                            : '-',
                          'Sumbu Y / skala 0-100',
                        ],
                      ].map(([label, value, note]) => (
                        <div className="nine-kpi" key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                          <small>{note}</small>
                          {label === 'Sudah dipetakan' && data.total > complete.length && (
                            <a
                              className="text-link"
                              href="#rincian-posisi"
                              onClick={() => {
                                setSelected(null);
                                setQ('');
                                setPage(1);
                              }}
                            >
                              Periksa kelengkapan pegawai
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                    <BoxGroups />
                    <Panel
                      title="Kelengkapan penilaian"
                      description={`Sumber tahun ${data.period.year}; data kegiatan dihitung sampai ${data.as_of}.`}
                    >
                      <p className="nine-table-note">
                        Posisi dihitung setelah semua komponen wajib tersedia. Rata-rata CKP memakai
                        bulan yang sudah tercatat sampai bulan berjalan pada tahun aktif.
                        Penghargaan dan pelatihan dihitung dari bukti terverifikasi.
                      </p>
                      <div className="nine-status-list">
                        <Badge tone="green">{complete.length} lengkap</Badge>
                        <Badge tone="orange">{data.total - complete.length} belum lengkap</Badge>
                      </div>
                    </Panel>
                  </aside>
                </div>
                <Panel
                  title={
                    selected === null ? 'Rincian posisi pegawai' : `Pegawai di box ${selected}`
                  }
                  description="Nilai sumbu merupakan jumlah kontribusi berbobot, masing-masing maksimal 100."
                >
                  <div className="nine-filter-row" id="rincian-posisi">
                    <Field label="Pencarian">
                      <div className="search-input">
                        <Search size={16} />
                        <input
                          aria-label="Cari pegawai pada 9 box"
                          placeholder="Cari nama, NIP, atau unit..."
                          value={q}
                          onChange={(e) => {
                            setQ(e.target.value);
                            setPage(1);
                          }}
                        />
                      </div>
                    </Field>
                    <Field label="Posisi box">
                      <select
                        aria-label="Filter posisi box"
                        value={selected ?? ''}
                        onChange={(e) => {
                          setSelected(e.target.value ? Number(e.target.value) : null);
                          setPage(1);
                        }}
                      >
                        <option value="">Semua box</option>
                        {boxes.map((box) => (
                          <option key={box.id} value={box.id}>
                            Box {box.id} - {box.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {rows.length ? (
                    <>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Pegawai</th>
                              <th>Potensial / X</th>
                              <th>Kinerja / Y</th>
                              <th>Posisi</th>
                              <th>Kelengkapan / tindakan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.slice((page - 1) * 8, page * 8).map((r) => (
                              <tr key={r.employee_id}>
                                <td>
                                  <button className="nine-name-button" onClick={() => setDetail(r)}>
                                    {r.name}
                                  </button>
                                  <small className="mono">{r.nip}</small>
                                </td>
                                <td>
                                  {number(r.x)}
                                  <small>{r.x_level || 'Belum lengkap'}</small>
                                </td>
                                <td>
                                  {number(r.y)}
                                  <small>{r.y_level || 'Belum lengkap'}</small>
                                </td>
                                <td>
                                  <Badge tone={tone(r)}>
                                    {r.box === null ? 'Belum dipetakan' : `Box ${r.box}`}
                                  </Badge>
                                  {r.box !== null && <small>{boxInfo(r.box).title}</small>}
                                </td>
                                <td>
                                  <div className="row-actions">
                                    <Button
                                      variant="ghost"
                                      onClick={() => setDetail(r)}
                                      aria-label={`Rincian penilaian ${r.name}`}
                                    >
                                      <Eye size={15} />
                                      Rincian
                                    </Button>
                                    {admin && period?.status === 'OPEN' && (
                                      <Button
                                        variant="ghost"
                                        onClick={() => setEditing(r)}
                                        aria-label={`Lengkapi nilai ${r.name}`}
                                      >
                                        <Pencil size={15} />
                                        Lengkapi
                                      </Button>
                                    )}
                                  </div>
                                  {r.missing.length > 0 && <small>{r.missing.join(', ')}</small>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Pagination page={page} total={rows.length} limit={8} onPage={setPage} />
                    </>
                  ) : (
                    <Empty
                      title="Tidak ada pegawai pada pilihan ini"
                      description="Ubah filter box, tim, atau pencarian untuk melihat posisi lainnya."
                    />
                  )}
                </Panel>
              </>
            ) : own ? (
              <>
                <Panel
                  title="Posisi Anda"
                  description={`Hasil penilaian tahun ${data.period.year}.`}
                >
                  <BoxPosition row={own} />
                </Panel>
                <div className="nine-components-grid">
                  <BoxScorePanel row={own} axis="x" />
                  <BoxScorePanel row={own} axis="y" />
                </div>
                <div className="nine-filter-row">
                  <Link className="btn btn-secondary" to="/potensial">
                    Jelajahi potensial
                    <ArrowRight size={15} />
                  </Link>
                  <Link className="btn btn-secondary" to="/kinerja">
                    Jelajahi kinerja
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            ) : (
              <Empty title="Profil pegawai belum tersedia" />
            )}
          </>
        )}
      </State>
      {settings && admin && (
        <Dialog title="Konfigurasi penilaian 9 box" onClose={() => setSettings(false)}>
          <NineBoxConfigEditor
            onClose={() => setSettings(false)}
            onSaved={() => {
              setSettings(false);
              state.refresh();
            }}
          />
        </Dialog>
      )}
      {detail && (
        <Dialog title={'Rincian penilaian - ' + detail.name} onClose={() => setDetail(null)}>
          <BoxPosition row={detail} />
          <ScoreBreakdown row={detail} />
          <p className="nine-table-note">
            Nilai yang belum lengkap tidak dianggap nol. Batas kategori mengikuti konfigurasi
            periode.
          </p>
          {admin && period?.status === 'OPEN' && (
            <Button
              onClick={() => {
                setDetail(null);
                setEditing(detail);
              }}
            >
              <Pencil size={15} />
              Lengkapi komponen potensial
            </Button>
          )}
        </Dialog>
      )}
      {editing && data && admin && (
        <NineBoxInputDialog
          row={editing}
          config={data.config}
          onClose={() => setEditing(null)}
          onSaved={state.refresh}
        />
      )}
    </div>
  );
}
export function AxisPage({ axis }: { axis: 'x' | 'y' }) {
  const { period } = usePeriod(),
    { user } = useAuth(),
    admin = user?.role === 'ADMIN',
    manager = user?.role !== 'PEGAWAI';
  const state = useApi<NineBoxResponse>(period ? `/nine-box/${period.id}` : null);
  const [employee, setEmployee] = useState(''),
    [editing, setEditing] = useState(false);
  useEffect(() => {
    setEmployee('');
    setEditing(false);
  }, [period?.id]);
  const row = state.data?.rows.find((r) => r.employee_id === employee) || state.data?.rows[0];
  const potential = axis === 'x';
  const links = potential
    ? [
        ['/kompetensi', 'Kompetensi'],
        [manager ? '/profil-dna' : '/asesmen-potensi', 'Potensi'],
        ['/kualifikasi', 'Kualifikasi'],
      ]
    : [
        ['/ckp', 'Nilai CKP bulanan'],
        ['/penghargaan', 'Penghargaan'],
        ['/penilaian-ketua', 'Penilaian ketua tim'],
      ];
  return (
    <div className="nine-box-page">
      <PageHeader
        title={potential ? 'Potensial' : 'Kinerja'}
        description={
          potential
            ? 'Sumbu X: kompetensi, potensi, dan kualifikasi.'
            : 'Sumbu Y: kinerja utama dan kinerja penguat.'
        }
        actions={
          potential && admin && row && period?.status === 'OPEN' ? (
            <Button onClick={() => setEditing(true)}>
              <Pencil size={16} />
              Nilai kualifikasi
            </Button>
          ) : undefined
        }
      />
      <Panel
        title={potential ? 'Komponen potensial' : 'Komponen kinerja'}
        description={`Tahun ${period?.year || ''} - total bobot 100%.`}
      >
        <div className="nine-filter-row">
          {manager && (
            <Field label="Pegawai">
              <select
                aria-label="Pegawai rincian sumbu"
                value={row?.employee_id || ''}
                onChange={(e) => setEmployee(e.target.value)}
              >
                {state.data?.rows.map((r) => (
                  <option value={r.employee_id} key={r.employee_id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <State {...state} retry={state.refresh}>
          {row ? (
            <>
              <div className="nine-record-heading">
                <div>
                  <h2>{row.name}</h2>
                  <p className="nine-table-note">{row.nip}</p>
                </div>
                <strong className="box-total-score">
                  {number(potential ? row.x : row.y)}
                  <small>/100</small>
                </strong>
              </div>
              <ScoreBreakdown row={row} axis={axis} />
              {row.missing.length > 0 && (
                <p className="nine-table-note">Menunggu: {row.missing.join(', ')}.</p>
              )}
            </>
          ) : (
            <Empty />
          )}
        </State>
      </Panel>
      <Panel title="Data pendukung" description="Buka komponen untuk meninjau data sumbernya.">
        <div className="nine-filter-row">
          {links.map(([path, label]) => (
            <Link
              className="btn btn-secondary"
              to={path + (manager && row ? '?pegawai=' + row.employee_id : '')}
              key={path}
            >
              {label}
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </Panel>
      {!potential && (
        <Panel
          title="Acuan penghargaan"
          description="Pilih penghargaan tertinggi yang terverifikasi pada tahun terpilih."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cakupan</th>
                  <th>Kabupaten / kota</th>
                  <th>Provinsi</th>
                  <th>Nasional</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Internal BPS</td>
                  <td>5 poin / kontribusi 3</td>
                  <td>10 poin / kontribusi 6</td>
                  <td>20 poin / kontribusi 12</td>
                </tr>
                <tr>
                  <td>Eksternal BPS</td>
                  <td>10 poin / kontribusi 6</td>
                  <td>15 poin / kontribusi 9</td>
                  <td>25 poin / kontribusi 15</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="nine-table-note">
            Kontribusi penghargaan = poin / 25 x 15. CKP berbobot 70%; penilaian ketua tim berbobot
            15%.
          </p>
        </Panel>
      )}
      {editing && row && state.data && (
        <NineBoxInputDialog
          row={row}
          config={state.data.config}
          onClose={() => setEditing(false)}
          onSaved={state.refresh}
        />
      )}
    </div>
  );
}
export function NineBoxReports() {
  const { period } = usePeriod();
  const state = useApi<NineBoxResponse>(period ? `/nine-box/${period.id}` : null);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [period?.id]);
  return (
    <div className="nine-box-page">
      <PageHeader
        title="Laporan 9 Box"
        description="Rekap potensial, kinerja, dan posisi box beserta kelengkapan penilaian."
        actions={
          period && (
            <a className="btn btn-primary" href={`/api/nine-box/${period.id}/export`}>
              <Download size={16} />
              Ekspor CSV
            </a>
          )
        }
      />
      <Panel title={`Rekap tahun ${period?.year || ''}`}>
        <State {...state} retry={state.refresh}>
          {state.data?.rows.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pegawai / NIP</th>
                      <th>Unit</th>
                      <th>Potensial (X)</th>
                      <th>Kinerja (Y)</th>
                      <th>Box</th>
                      <th>Menunggu data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.rows.slice((page - 1) * 20, page * 20).map((row) => (
                      <tr key={row.employee_id}>
                        <td>
                          <strong>{row.name}</strong>
                          <small className="mono">{row.nip}</small>
                        </td>
                        <td>{row.unit}</td>
                        <td>{number(row.x)}</td>
                        <td>{number(row.y)}</td>
                        <td>
                          {row.box === null
                            ? 'Belum dipetakan'
                            : `Box ${row.box} - ${boxInfo(row.box).title}`}
                        </td>
                        <td>{row.missing.join(', ') || 'Lengkap'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={state.data.rows.length} limit={20} onPage={setPage} />
            </>
          ) : (
            <Empty />
          )}
        </State>
      </Panel>
    </div>
  );
}
