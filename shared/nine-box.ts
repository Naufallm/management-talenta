import type { NineBoxConfig } from './nine-box-validation.ts';
export type { NineBoxConfig, NineBoxInput } from './nine-box-validation.ts';
export const educationLevels = ['SD', 'SMP', 'SMA', 'D1', 'D2', 'D3', 'D4/S1', 'S2', 'S3'] as const;
export const awardLevels = ['CITY', 'PROVINCE', 'NATIONAL'] as const;
export const awardScopes = ['INTERNAL', 'EXTERNAL'] as const;
export const defaultNineBoxConfig: NineBoxConfig = {
  x_medium_from: 60,
  x_high_from: 80,
  y_medium_from: 60,
  y_high_from: 80,
  training_hours_target: 40,
  award_mode: 'HIGHEST',
  assessment_source: 'DNA',
  education_scores: {
    SD: 20,
    SMP: 30,
    SMA: 40,
    D1: 50,
    D2: 60,
    D3: 70,
    'D4/S1': 80,
    S2: 90,
    S3: 100,
  },
};
export const boxes = [
  {
    id: 1,
    title: 'Tindak lanjut sesuai ketentuan',
    group: 'followup',
    description: 'Fokus pada pembinaan kinerja dan rencana tindak lanjut.',
  },
  {
    id: 2,
    title: 'Perlu pembinaan kinerja',
    group: 'followup',
    description: 'Perkuat pelaksanaan dan hasil pekerjaan melalui pendampingan.',
  },
  {
    id: 3,
    title: 'Perlu pembinaan kinerja',
    group: 'followup',
    description: 'Selaraskan kemampuan yang tersedia dengan perbaikan capaian kerja.',
  },
  {
    id: 4,
    title: 'Tingkat / dipertahankan',
    group: 'development',
    description: 'Pertahankan kinerja dan perluas pengembangan kemampuan.',
  },
  {
    id: 5,
    title: 'Inti / solid performer',
    group: 'development',
    description: 'Kembangkan kesiapan dan konsistensi menuju kelompok suksesi.',
  },
  {
    id: 6,
    title: 'Potensial / perlu pengembangan',
    group: 'development',
    description: 'Arahkan potensial tinggi menjadi hasil kerja yang konsisten.',
  },
  {
    id: 7,
    title: 'Suksesor instansi',
    group: 'succession',
    description: 'Kelompok rencana suksesi instansi dengan prioritas pengembangan.',
  },
  {
    id: 8,
    title: 'Suksesor instansi',
    group: 'succession',
    description: 'Kelompok rencana suksesi instansi dengan penguatan kinerja.',
  },
  {
    id: 9,
    title: 'Bintang / suksesi nasional',
    group: 'succession',
    description: 'Kandidat pengembangan menuju rencana suksesi nasional.',
  },
] as const;
export const boxGrid = [
  [4, 7, 9],
  [2, 5, 8],
  [1, 3, 6],
];
export const boxInfo = (id: number) => boxes.find((box) => box.id === id)!;
export const weights = {
  training: 30,
  experience: 10,
  assessment: 30,
  education: 15,
  field_match: 15,
  ckp: 70,
  awards: 15,
  leader: 15,
};
export type Level = 'Rendah' | 'Sedang' | 'Tinggi';
export function scoreLevel(score: number, medium: number, high: number): Level {
  return score >= high ? 'Tinggi' : score >= medium ? 'Sedang' : 'Rendah';
}
export function boxNumber(x: number, y: number, c: NineBoxConfig) {
  const column = x >= c.x_high_from ? 2 : x >= c.x_medium_from ? 1 : 0;
  const row = y >= c.y_high_from ? 2 : y >= c.y_medium_from ? 1 : 0;
  return [
    [1, 3, 6],
    [2, 5, 8],
    [4, 7, 9],
  ][row][column];
}
export function awardPoints(
  level: (typeof awardLevels)[number],
  scope: (typeof awardScopes)[number],
) {
  return {
    INTERNAL: { CITY: 5, PROVINCE: 10, NATIONAL: 20 },
    EXTERNAL: { CITY: 10, PROVINCE: 15, NATIONAL: 25 },
  }[scope][level];
}
export function normalizeEducation(value: string): (typeof educationLevels)[number] | null {
  const v = value.toUpperCase().replace(/[.\s_-]/g, '');
  if (/S3|DOKTOR/.test(v)) return 'S3';
  if (/S2|MAGISTER/.test(v)) return 'S2';
  if (/S1|D4|DIV|SARJANA/.test(v)) return 'D4/S1';
  if (/D3|DIII/.test(v)) return 'D3';
  if (/D2|DII/.test(v)) return 'D2';
  if (/D1|DI$/.test(v)) return 'D1';
  if (/SMA|SMK|MAN|SMEA/.test(v)) return 'SMA';
  if (/SMP|MTS/.test(v)) return 'SMP';
  if (/SD|MI$/.test(v)) return 'SD';
  return null;
}
export type ComponentKey = keyof typeof weights;
export interface ScoringSources {
  training_hours: number;
  experience_points: number;
  assessment: number | null;
  education: number | null;
  field_match: number | null;
  ckp: number | null;
  award_points: number[];
  unclassified_awards: number;
  leader: number | null;
}
export interface ScorePart {
  key: ComponentKey;
  label: string;
  raw: number | null;
  score: number | null;
  weight: number;
  contribution: number | null;
  unit: string;
}
const rounded = (n: number) => Math.round(n * 100) / 100;
const cap = (n: number) => Math.max(0, Math.min(100, n));
export function calculateNineBox(s: ScoringSources, c: NineBoxConfig) {
  const award = s.award_points.length
    ? c.award_mode === 'HIGHEST'
      ? Math.max(...s.award_points)
      : Math.min(
          25,
          s.award_points.reduce((a, b) => a + b, 0),
        )
    : 0;
  const part = (
    key: ComponentKey,
    label: string,
    raw: number | null,
    score: number | null,
    unit: string,
  ): ScorePart => ({
    key,
    label,
    raw,
    score: score === null ? null : rounded(cap(score)),
    weight: weights[key],
    contribution: score === null ? null : rounded((cap(score) * weights[key]) / 100),
    unit,
  });
  const xParts = [
    part(
      'training',
      'Pelatihan / pengembangan kompetensi',
      s.training_hours,
      (s.training_hours / c.training_hours_target) * 100,
      'jam',
    ),
    part(
      'experience',
      'Pengalaman jabatan / tim',
      s.experience_points,
      (s.experience_points / 20) * 100,
      'poin',
    ),
    part('assessment', 'Nilai asesmen potensi', s.assessment, s.assessment, 'nilai'),
    part('education', 'Pendidikan formal', s.education, s.education, 'nilai'),
    part(
      'field_match',
      'Kesesuaian bidang ilmu',
      s.field_match,
      s.field_match === null ? null : (s.field_match / 10) * 100,
      'poin',
    ),
  ];
  const yParts = [
    part('ckp', 'Kinerja utama / CKP', s.ckp, s.ckp, 'nilai'),
    part(
      'awards',
      'Penghargaan',
      s.unclassified_awards ? null : award,
      s.unclassified_awards ? null : (award / 25) * 100,
      'poin',
    ),
    part('leader', 'Penilaian ketua tim', s.leader, s.leader, 'nilai'),
  ];
  const total = (parts: ScorePart[]) =>
    parts.some((p) => p.score === null)
      ? null
      : rounded(parts.reduce((sum, p) => sum + (p.contribution ?? 0), 0));
  const x = total(xParts),
    y = total(yParts);
  return {
    x,
    y,
    box: x === null || y === null ? null : boxNumber(x, y, c),
    x_level: x === null ? null : scoreLevel(x, c.x_medium_from, c.x_high_from),
    y_level: y === null ? null : scoreLevel(y, c.y_medium_from, c.y_high_from),
    x_parts: xParts,
    y_parts: yParts,
    missing: [...xParts, ...yParts].filter((p) => p.score === null).map((p) => p.label),
  };
}
export type NineBoxScore = ReturnType<typeof calculateNineBox>;
export interface NineBoxRow extends NineBoxScore {
  employee_id: string;
  name: string;
  nip: string;
  unit: string;
}
export interface NineBoxResponse {
  period: { id: string; year: number; name: string; status: string };
  config: NineBoxConfig;
  config_version: number;
  rows: NineBoxRow[];
  total: number;
  complete: number;
  as_of: string;
}
