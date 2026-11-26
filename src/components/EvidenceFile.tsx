import { Paperclip } from 'lucide-react';

export function EvidenceFile({ id }: { id: string | null }) {
  return id ? (
    <a className="text-link" href={`/api/documents/${id}`}>
      <Paperclip size={14} aria-hidden="true" /> Unduh bukti
    </a>
  ) : (
    <span className="muted">Belum dilampirkan</span>
  );
}
