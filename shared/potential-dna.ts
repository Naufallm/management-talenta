export const dnaVersion = 'bps-dna-30-v1';
export const dnaScoringVersion = 'bps-dna-30-v2';
export const dnaSource = '221026 bahan pemetaan pegawai.docx';
export const dnaClusters = ['DRIVE', 'NETWORK', 'ACTION'] as const;
export type DnaCluster = (typeof dnaClusters)[number];
export const dnaClusterInfo: Record<DnaCluster, { name: string; description: string }> = {
  DRIVE: {
    name: 'Drive',
    description:
      'Drive menggambarkan dorongan untuk mencapai tujuan, belajar, dan menyelesaikan tantangan. Karakter ini terlihat dalam inisiatif, ketekunan, pemikiran analitis, serta keberanian mengembangkan ide. Dalam bekerja, energi ini dapat diarahkan dengan sasaran yang jelas, prioritas yang terukur, dan evaluasi kemajuan.',
  },
  NETWORK: {
    name: 'Network',
    description:
      'Network menggambarkan cara membangun hubungan, memahami orang lain, dan bekerja bersama. Karakter ini terlihat dalam empati, kesediaan mendengar, komunikasi, serta kemampuan menjembatani perbedaan. Dalam tim, kecenderungan ini mendukung koordinasi, pertukaran informasi, dan penyelesaian masalah melalui kolaborasi.',
  },
  ACTION: {
    name: 'Action',
    description:
      'Action menggambarkan cara mengubah rencana menjadi hasil melalui langkah kerja yang teratur. Karakter ini terlihat dalam ketelitian, konsistensi menjalankan prosedur, pengelolaan waktu, dan tanggung jawab menuntaskan tugas. Dalam bekerja, kecenderungan ini mendukung mutu hasil dan pelaksanaan yang dapat diandalkan.',
  },
};
export interface DnaQuestion {
  id: string;
  number: number;
  text: string;
  cluster?: DnaCluster;
}
export const dnaLevelValues = {
  'Moderat tinggi': 100,
  'Sangat tinggi': 80,
  Tinggi: 60,
  Moderat: 40,
  Rendah: 20,
} as const;
// Allocate hundredths by largest remainder so the displayed total is exactly 100%.
export function dnaComposition(scores: Record<DnaCluster, number>): Record<DnaCluster, number> {
  const total = dnaClusters.reduce((sum, cluster) => sum + scores[cluster], 0);
  const parts = dnaClusters.map((cluster, index) => {
    const exact = total ? (scores[cluster] / total) * 10000 : 10000 / 3;
    return { cluster, index, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  const remaining = 10000 - parts.reduce((sum, part) => sum + part.value, 0);
  [...parts]
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, remaining)
    .forEach((part) => part.value++);
  return Object.fromEntries(parts.map((part) => [part.cluster, part.value / 100])) as Record<
    DnaCluster,
    number
  >;
}
export type DnaLevel = keyof typeof dnaLevelValues;
export function dnaValueLevel(value: number): DnaLevel {
  if (value <= 20) return 'Rendah';
  if (value <= 40) return 'Moderat';
  if (value <= 60) return 'Tinggi';
  if (value <= 80) return 'Sangat tinggi';
  return 'Moderat tinggi';
}
export const dnaFormations = [
  {
    id: 'statistisi',
    name: 'Statistisi',
    description: 'Analisis data yang objektif, teliti, berbasis fakta, dan mengikuti metodologi.',
  },
  {
    id: 'pranata-komputer',
    name: 'Pranata Komputer',
    description: 'Pemecahan masalah teknis, logika, dan pengembangan ide untuk sistem informasi.',
  },
  {
    id: 'pengelola-keuangan',
    name: 'Pengelola Keuangan',
    description: 'Ketelitian, kepatuhan aturan, dan pengelolaan administrasi berbasis bukti.',
  },
  {
    id: 'pengelola-kepegawaian',
    name: 'Pengelola Kepegawaian',
    description: 'Hubungan interpersonal, empati, komunikasi, dan koordinasi pegawai.',
  },
] as const;
export interface DnaFormationResult {
  id: string;
  name: string;
  description: string;
  match: number;
  rank: number;
  aspects: {
    name: string;
    detail: string;
    numbers?: number[];
    actual: number;
    ideal: number;
    level: DnaLevel;
    gap: number;
  }[];
  strengths: string[];
  development: string[];
}
export interface DnaResult {
  version: string;
  scores: Record<DnaCluster, number>;
  composition?: Record<DnaCluster, number>;
  dominant: DnaCluster[];
  explanations: Record<DnaCluster, string>;
  highlights?: Record<DnaCluster, { number: number; text: string; value: number }[]>;
  formations: DnaFormationResult[];
}
export interface DnaAssessment {
  question_revision?: string;
  version: string;
  questions: DnaQuestion[];
  answers: Record<string, number>;
  instructions_accepted_at: string | null;
  submitted_at: string | null;
  updated_at: string | null;
  result: DnaResult | null;
}
export interface DnaHistoryEntry {
  period_id: string;
  year: number;
  period_name: string;
  answered_count: number;
  submitted_at: string | null;
  updated_at: string;
}
