import { useRef, useState } from 'react';
import { ChevronDown, Search, Users } from 'lucide-react';
import { ckpLineColors, type CkpEmployeeTrend } from '../../shared/ckp';
import { Button } from './ui';

export function CkpEmployeeFilter({
  employees,
  selected,
  onChange,
}: {
  employees: CkpEmployeeTrend[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const picker = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (picker.current) {
      picker.current.open = false;
      picker.current.querySelector('summary')?.focus();
    }
  };
  const matching = employees.filter((employee) =>
    `${employee.name} ${employee.nip}`
      .toLocaleLowerCase('id')
      .includes(query.toLocaleLowerCase('id').trim()),
  );
  const visibleSelected = employees.filter((employee) => selected.includes(employee.employee_id));
  return (
    <div className="field ckp-employee-filter">
      <span>Pegawai pembanding</span>
      <details
        ref={picker}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        }}
      >
        <summary aria-label="Pilih pegawai pembanding">
          <Users size={17} />
          <span className="ckp-picker-value">
            {visibleSelected.length
              ? visibleSelected
                  .slice(0, 2)
                  .map((employee) => employee.name)
                  .join(', ') +
                (visibleSelected.length > 2 ? ` +${visibleSelected.length - 2} lainnya` : '')
              : 'Semua pegawai · Rata-rata'}
          </span>
          {visibleSelected.length > 0 && <strong>{visibleSelected.length}</strong>}
          <ChevronDown className="ckp-picker-chevron" size={16} />
        </summary>
        <div className="ckp-picker-menu">
          <label className="search-input ckp-checkbox-search">
            <Search size={16} />
            <input
              aria-label="Cari pegawai pembanding"
              placeholder="Cari nama atau NIP…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="ckp-selection-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => onChange(employees.map((employee) => employee.employee_id))}
            >
              Pilih semua
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => onChange([])}
              disabled={!visibleSelected.length}
            >
              Hapus pilihan
            </Button>
          </div>
          <fieldset className="ckp-checkbox-list">
            <legend className="sr-only">Pilih pegawai untuk grafik garis</legend>
            {matching.map((employee) => {
              const color = ckpLineColors[employees.indexOf(employee) % ckpLineColors.length];
              return (
                <label key={employee.employee_id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(employee.employee_id)}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...selected, employee.employee_id]
                          : selected.filter((id) => id !== employee.employee_id),
                      )
                    }
                  />
                  <span className="ckp-color-dot" style={{ backgroundColor: color }} />
                  <span>
                    <strong>{employee.name}</strong>
                    <small className="mono">{employee.nip}</small>
                  </span>
                </label>
              );
            })}
            {!matching.length && <p className="muted">Pegawai tidak ditemukan.</p>}
          </fieldset>
          <div className="ckp-picker-footer">
            <span>
              {visibleSelected.length} dari {employees.length} pegawai dipilih
            </span>
            <Button type="button" variant="secondary" onClick={close}>
              Selesai
            </Button>
          </div>
        </div>
      </details>
      <small>Centang pegawai untuk membandingkan garis kinerja.</small>
    </div>
  );
}
