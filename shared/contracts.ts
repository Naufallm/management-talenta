import { z } from 'zod';
import { roles } from './constants.ts';
export { roles, indicators, months } from './constants.ts';
export type Role = (typeof roles)[number];
export interface User {
  id: string;
  username: string;
  role: Role;
  employee_id: string | null;
  name: string;
  must_change_password: boolean;
  is_leader: boolean;
  csrfToken: string;
}
export interface QuickLoginAccount {
  username: string;
  role: Role;
  name: string;
}
export interface LoginOptions {
  testingLogin: boolean;
  password?: string;
  accounts: QuickLoginAccount[];
}
export const employeeSchema = z.object({
  nip: z.string().regex(/^\d{18}$/, 'NIP harus terdiri dari 18 angka.'),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(120),
  position: z.string().trim().min(2).max(150),
  grade: z.string().trim().min(1).max(20),
  unit: z.string().trim().min(2).max(100),
  email: z.union([z.email(), z.literal('')]).default(''),
  phone: z
    .string()
    .regex(/^[+\d\s()-]*$/, 'Nomor telepon tidak valid.')
    .max(30)
    .default(''),
  active: z.boolean().default(true),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;
export interface Employee extends EmployeeInput {
  id: string;
  teams?: string;
  created_at?: string;
}
export interface Period {
  id: string;
  name: string;
  year: number;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  starts_on: string;
  ends_on: string;
}
export const periodSchema = z
  .object({
    year: z.number().int().min(2020).max(2100),
    name: z.string().trim().min(3).max(120),
    starts_on: z.iso.date(),
    ends_on: z.iso.date(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED']),
  })
  .refine((d) => d.ends_on >= d.starts_on, {
    message: 'Tanggal akhir harus setelah tanggal mulai.',
  });
export const scoreConfigSchema = z
  .object({
    managerial_weight: z.number().min(0).max(100),
    technical_weight: z.number().min(0).max(100),
    evidence_weight: z.number().min(0).max(100),
    leader_weight: z.number().min(0).max(100),
    potential_threshold: z.number().min(1).max(99),
    competency_threshold: z.number().min(1).max(99),
    training_hours_target: z.number().positive().max(10000),
    achievement_points: z.number().min(0).max(100),
    employee_uploads: z.boolean(),
  })
  .refine((d) => d.managerial_weight + d.technical_weight === 100, {
    message: 'Total bobot potensi harus 100%.',
  })
  .refine((d) => d.evidence_weight + d.leader_weight === 100, {
    message: 'Total bobot kompetensi harus 100%.',
  });
export type ScoreConfig = z.infer<typeof scoreConfigSchema> & { version: number };
export const questionSchema = z.object({
  text: z.string().trim().min(5).max(2000),
  category: z.enum(['MANAJERIAL', 'TEKNIS', 'REFLEKSI']),
  sort_order: z.number().int().min(1).max(1000),
  active: z.boolean(),
});
export interface Question extends z.infer<typeof questionSchema> {
  id: string;
  period_id: string;
}
export const answerSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(1).max(5)),
  submit: z.boolean().default(false),
});
export const leaderSchema = z.object({
  employee_id: z.string().min(1),
  indicators: z.record(z.string(), z.number().min(0).max(100)),
  note: z.string().trim().max(2000).default(''),
  submit: z.boolean().default(false),
});
export const ckpSchema = z.object({
  employee_id: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  score: z.number().min(0).max(100),
});
export const evidenceSchema = z.object({
  employee_id: z.string().min(1),
  kind: z.enum(['training', 'achievement']),
  name: z.string().trim().min(3).max(200),
  activity_type: z.string().trim().min(2).max(100),
  activity_date: z.iso.date(),
  organizer: z.string().trim().min(2).max(150),
  hours: z.number().min(0).max(10000),
  document_id: z.string().nullable().default(null),
  verified: z.boolean().default(false),
});
export type Quadrant =
  'Talenta Unggul' | 'Profesional Andal' | 'Perlu Pengembangan' | 'Talenta Berkembang';
export interface TalentPoint {
  employee_id: string;
  name: string;
  nip: string;
  unit: string;
  potential: number;
  competency: number;
  quadrant: Quadrant;
  year?: number;
}
