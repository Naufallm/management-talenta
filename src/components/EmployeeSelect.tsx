import { useState, useEffect } from 'react';
import { useApi } from '../lib/context';
import type { Employee } from '../../shared/contracts';
export function EmployeeSelect({
  name = 'employee_id',
  value,
  onChange,
  required = true,
  allowAll = false,
}: {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  allowAll?: boolean;
}) {
  const [query, setQuery] = useState(''),
    [q, setQ] = useState(''),
    [selected, setSelected] = useState<Employee | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setQ(query), 200);
    return () => clearTimeout(id);
  }, [query]);
  const { data, error, loading } = useApi<{ rows: Employee[] }>(
      `/employees?limit=50&q=${encodeURIComponent(q)}`,
    ),
    rows = data?.rows || [];
  const options = selected && !rows.some((r) => r.id === selected.id) ? [selected, ...rows] : rows;
  return (
    <div className="employee-select">
      <input
        aria-label="Cari pilihan pegawai"
        placeholder="Cari nama atau NIP…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        aria-label="Pilihan pegawai"
        name={name}
        value={value}
        required={required}
        onChange={(e) => {
          setSelected(options.find((o) => o.id === e.target.value) || null);
          onChange?.(e.target.value);
        }}
      >
        <option value="">
          {allowAll ? 'Semua pegawai' : loading ? 'Memuat…' : 'Pilih pegawai'}
        </option>
        {options.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name} · {e.nip}
          </option>
        ))}
      </select>
      {error && (
        <small role="alert" className="form-error">
          {error}
        </small>
      )}
    </div>
  );
}
