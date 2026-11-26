import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowUpRight, ChevronRight, CheckCircle2, CircleAlert, Target } from 'lucide-react';
import {
  boxGrid,
  boxInfo,
  boxes,
  type NineBoxRow,
  type NineBoxConfig,
  type ComponentKey,
} from '../../shared/nine-box';
import { number, Panel, Badge, Button, Dialog } from './ui';
import './NineBox.css';
export function BoxPosition({ row }: { row: NineBoxRow }) {
  if (row.box === null)
    return (
      <div className="box-pending">
        <CircleAlert size={28} />
        <div>
          <h2>Posisi box belum tersedia</h2>
          <p>Lengkapi komponen penilaian berikut agar posisi dapat dihitung.</p>
          <ul>
            {row.missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  const info = boxInfo(row.box);
  return (
    <div className={`box-position box-tone-${info.group}`}>
      <div className="box-position-number">
        <span>POSISI TALENTA</span>
        <strong>{row.box}</strong>
        <span>BOX</span>
      </div>
      <div className="box-position-content">
        <Badge
          tone={
            info.group === 'succession'
              ? 'green'
              : info.group === 'development'
                ? 'orange'
                : 'neutral'
          }
        >
          {info.group === 'succession'
            ? 'Kelompok rencana suksesi'
            : info.group === 'development'
              ? 'Perlu pengembangan'
              : 'Perlu tindak lanjut kinerja'}
        </Badge>
        <h2>{info.title}</h2>
        <p>{info.description}</p>
        <div className="box-own-scores">
          <div>
            <span>Potensial / sumbu X</span>
            <strong>
              {number(row.x)}
              <small>/100</small>
            </strong>
            <em>{row.x_level}</em>
            <div className="box-axis-meter">
              <span style={{ width: `${row.x || 0}%` }} />
            </div>
          </div>
          <div>
            <span>Kinerja / sumbu Y</span>
            <strong>
              {number(row.y)}
              <small>/100</small>
            </strong>
            <em>{row.y_level}</em>
            <div className="box-axis-meter">
              <span style={{ width: `${row.y || 0}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function NineBoxMatrix({
  rows,
  selected,
  onSelect,
  onEmployee,
  config,
}: {
  rows: NineBoxRow[];
  selected?: number | null;
  onSelect?: (box: number) => void;
  onEmployee?: (row: NineBoxRow) => void;
  config: NineBoxConfig;
}) {
  const [openBox, setOpenBox] = useState<number | null>(null);
  const openPeople = openBox === null ? [] : rows.filter((row) => row.box === openBox);

  return (
    <div className="nine-matrix-wrap">
      <div className="nine-y-caption">Kinerja (Y)</div>
      <div className="nine-matrix-body">
        <div className="nine-y-levels">
          {['Tinggi', 'Sedang', 'Rendah'].map((level) => (
            <span key={level}>{level}</span>
          ))}
        </div>
        <div
          className="nine-grid"
          aria-label="Matriks sembilan box; kinerja pada sumbu Y dan potensial pada sumbu X"
        >
          {boxGrid.flat().map((id) => {
            const info = boxInfo(id),
              people = rows.filter((row) => row.box === id);
            return (
              <section
                key={id}
                className={`nine-cell nine-cell-${id} box-tone-${info.group}${selected === id ? ' is-selected' : ''}`}
                aria-label={`Box ${id}: ${info.title}`}
              >
                <button
                  className="nine-cell-heading"
                  aria-haspopup="dialog"
                  aria-label={`Box ${id}, ${info.title}, ${people.length} pegawai`}
                  onClick={() => setOpenBox(id)}
                >
                  <span className="nine-cell-number">
                    <span className="nine-position-icon" aria-hidden="true">
                      {boxGrid.flat().map((position) => (
                        <i key={position} className={position === id ? 'active' : undefined} />
                      ))}
                    </span>
                    {id}
                  </span>
                  <span className="nine-cell-count">
                    {people.length}
                    <span className="nine-count-label"> pegawai</span>
                  </span>
                  <strong title={info.title}>{info.title}</strong>
                </button>
                <div className="nine-cell-people">
                  {people.slice(0, 2).map((person) => (
                    <button
                      key={person.employee_id}
                      title={person.name}
                      onClick={() => onEmployee?.(person)}
                    >
                      <span className="nine-person-name">{person.name}</span>
                      <ChevronRight size={12} aria-hidden="true" />
                    </button>
                  ))}
                  {!people.length && <span className="nine-cell-empty">Belum ada pegawai</span>}
                  {people.length > 2 && (
                    <button
                      className="nine-roster-more"
                      aria-label={`Lihat semua ${people.length} pegawai di box ${id}`}
                      aria-haspopup="dialog"
                      onClick={() => setOpenBox(id)}
                    >
                      +{people.length - 2} lainnya
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <div className="nine-x-levels">
          <span>Rendah</span>
          <span>Sedang</span>
          <span>Tinggi</span>
        </div>
      </div>
      <div className="nine-x-caption">Potensial (X)</div>
      {openBox !== null && (
        <Dialog
          title={`Box ${openBox} · ${boxInfo(openBox).title}`}
          onClose={() => setOpenBox(null)}
        >
          <div className={`nine-box-roster box-tone-${boxInfo(openBox).group}`}>
            <p>
              {openPeople.length
                ? `${openPeople.length} pegawai di box ini`
                : 'Belum ada pegawai di box ini.'}
            </p>
            {openPeople.length > 0 && (
              <ul>
                {openPeople.map((row) => (
                  <li key={row.employee_id}>
                    <button
                      className="nine-name-button"
                      onClick={() => {
                        setOpenBox(null);
                        onEmployee?.(row);
                      }}
                    >
                      <span>{row.name}</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {onSelect && selected !== openBox && (
              <Button
                variant="secondary"
                onClick={() => {
                  onSelect(openBox);
                  setOpenBox(null);
                }}
              >
                Filter tabel ke box ini
              </Button>
            )}
          </div>
        </Dialog>
      )}
      <p className="nine-boundaries">
        Potensial: sedang mulai {number(config.x_medium_from)}, tinggi mulai{' '}
        {number(config.x_high_from)}. Kinerja: sedang mulai {number(config.y_medium_from)}, tinggi
        mulai {number(config.y_high_from)}.
      </p>
    </div>
  );
}
export function BoxGroups() {
  return (
    <div className="nine-group-list">
      {[
        {
          group: 'succession',
          title: 'Box 7, 8, 9',
          label: 'Kelompok rencana suksesi',
          text: 'Prioritas pengembangan untuk kesiapan jabatan target. Penempatan tetap memerlukan evaluasi dan keputusan instansi.',
          icon: CheckCircle2,
        },
        {
          group: 'development',
          title: 'Box 4, 5, 6',
          label: 'Perlu pengembangan',
          text: 'Perkuat kompetensi, pendampingan, dan konsistensi kinerja untuk mendukung kemajuan.',
          icon: Target,
        },
        {
          group: 'followup',
          title: 'Box 1, 2, 3',
          label: 'Perlu tindak lanjut kinerja',
          text: 'Susun pembinaan dan tindak lanjut sesuai kebutuhan pegawai serta ketentuan instansi.',
          icon: CircleAlert,
        },
      ].map(({ group, title, label, text, icon: Icon }) => (
        <article className={`nine-group box-tone-${group}`} key={group}>
          <Icon size={20} />
          <div>
            <small>{title}</small>
            <h3>{label}</h3>
            <p>{text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
export function ScoreBreakdown({
  row,
  axis,
  componentKeys,
}: {
  row: NineBoxRow;
  axis?: 'x' | 'y';
  componentKeys?: ComponentKey[];
}) {
  const axisParts =
    axis === 'x' ? row.x_parts : axis === 'y' ? row.y_parts : [...row.x_parts, ...row.y_parts];
  const parts = componentKeys
    ? axisParts.filter((part) => componentKeys.includes(part.key))
    : axisParts;
  return (
    <div className="table-wrap">
      <table className="box-score-table">
        <thead>
          <tr>
            <th>Komponen</th>
            <th>Data sumber</th>
            <th>Nilai / 100</th>
            <th>Bobot</th>
            <th>Kontribusi</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr key={part.key}>
              <td>
                <strong>{part.label}</strong>
              </td>
              <td>
                {part.raw === null ? (
                  <Badge tone="orange">Belum lengkap</Badge>
                ) : (
                  <>
                    {number(part.raw)} <small className="inline-unit">{part.unit}</small>
                  </>
                )}
              </td>
              <td>{number(part.score)}</td>
              <td>{part.weight}%</td>
              <td>
                <strong>{number(part.contribution)}</strong>
                <div className="box-contribution-bar">
                  <span style={{ width: `${part.score || 0}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function BoxScorePanel({ row, axis }: { row: NineBoxRow; axis: 'x' | 'y' }) {
  return (
    <Panel
      title={axis === 'x' ? 'Potensial / Sumbu X' : 'Kinerja / Sumbu Y'}
      description={
        axis === 'x'
          ? 'Pelatihan, pengalaman, asesmen, dan kualifikasi.'
          : 'CKP tahun terpilih dan komponen penguat kinerja.'
      }
      actions={
        <strong className="box-total-score">
          {number(axis === 'x' ? row.x : row.y)}
          <small>/100</small>
        </strong>
      }
    >
      <div className="axis-mini-list">
        {(axis === 'x' ? row.x_parts : row.y_parts).map((part) => (
          <div key={part.key}>
            <span>{part.label}</span>
            <strong>
              {number(part.contribution)}
              <small> / {part.weight}</small>
            </strong>
          </div>
        ))}
      </div>
      <details className="axis-detail">
        <summary>Lihat rincian perhitungan</summary>
        <ScoreBreakdown row={row} axis={axis} />
      </details>
      <Link className="axis-explore-link" to={axis === 'x' ? '/potensial' : '/kinerja'}>
        Buka {axis === 'x' ? 'potensial' : 'kinerja'}
        <ChevronRight size={15} />
      </Link>
    </Panel>
  );
}
export { boxes };

export function NineBoxWelcome({
  name,
  year,
  manager,
  total,
  complete,
}: {
  name: string;
  year: number;
  manager: boolean;
  total: number;
  complete: number;
}) {
  return (
    <section className="talent-welcome">
      <div className="talent-welcome-copy">
        <span className="welcome-pill">
          <span />
          {year} / Pengembangan talenta
        </span>
        <h2>
          {manager
            ? 'Kenali talenta. Siapkan langkah berikutnya.'
            : 'Ruang untuk tumbuh, peluang untuk melangkah.'}
        </h2>
        <p>
          {manager
            ? `${complete} dari ${total} pegawai telah memiliki pemetaan lengkap. Telusuri kemampuan dan capaian untuk mendukung pengembangan tim.`
            : `Halo, ${name.split(',')[0]}. Lihat posisi Anda dan jelajahi setiap komponen yang membentuk perjalanan pengembangan Anda.`}
        </p>
        <Link to={manager ? '/potensial' : '/kompetensi'}>
          {manager ? 'Jelajahi penilaian' : 'Lihat pengembangan saya'}
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="welcome-art" aria-hidden="true">
        <div className="welcome-orbit" />
        {manager ? (
          <div className="welcome-art-grid">
            {boxGrid.flat().map((id) => (
              <span className={'welcome-art-box box-' + id} key={id}>
                {id}
              </span>
            ))}
          </div>
        ) : (
          <div className="welcome-growth">
            <span />
            <span />
            <span />
            <ArrowUpRight size={50} />
          </div>
        )}
        <span className="welcome-art-label">
          {manager ? 'POTENSIAL + KINERJA' : 'LANGKAH PENGEMBANGAN'}
        </span>
      </div>
    </section>
  );
}
