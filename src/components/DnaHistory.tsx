import { History } from 'lucide-react';
import type { DnaHistoryEntry } from '../../shared/potential-dna';
import { useApi, usePeriod } from '../lib/context';
import { Panel, Field, State } from './ui';
import './DnaHistory.css';

export function DnaHistory({ employeeId }: { employeeId: string }) {
  const { period, periods, setPeriod } = usePeriod();
  const history = useApi<{ rows: DnaHistoryEntry[] }>(
    `/potential-dna/history/${encodeURIComponent(employeeId)}`,
  );
  return (
    <Panel
      className="dna-history"
      title="Riwayat potensi"
      description="Pilih periode untuk melihat hasil dan jawaban pada tahun tersebut."
    >
      <div className="dna-history-toolbar">
        <Field label="Periode potensi">
          <select value={period?.id || ''} onChange={(event) => setPeriod(event.target.value)}>
            {!periods.length && <option value="">Tanpa periode</option>}
            {periods.map((p) => {
              const entry = history.data?.rows.find((r) => r.period_id === p.id);
              return (
                <option key={p.id} value={p.id}>
                  {[
                    p.year,
                    p.name,
                    entry ? (entry.submitted_at ? 'Terkirim' : 'Isian tersimpan') : 'Belum diisi',
                  ].join(' \u00b7 ')}
                </option>
              );
            })}
          </select>
        </Field>
        <State {...history} retry={history.refresh}>
          <p>
            <History size={16} aria-hidden="true" />
            {history.data?.rows.length || 0} tahun memiliki isian tersimpan
          </p>
        </State>
      </div>
    </Panel>
  );
}
