export interface CkpEmployeeTrend {
  employee_id: string;
  name: string;
  nip: string;
  trend: { month: number; score: number | null }[];
}

export const ckpLineColors = [
  '#2c3cdd',
  '#b45309',
  '#0f766e',
  '#9333a1',
  '#c2410c',
  '#2563eb',
  '#4d7c0f',
  '#be185d',
  '#0e7490',
  '#6d28d9',
  '#a16207',
  '#047857',
  '#9f1239',
  '#4338ca',
  '#a21caf',
  '#0369a1',
  '#3f6212',
  '#b91c1c',
  '#115e59',
  '#7e22ce',
  '#92400e',
  '#1d4ed8',
  '#166534',
];
