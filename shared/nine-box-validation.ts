import { z } from 'zod';
import { educationLevels } from './nine-box.ts';

const bounded = z.number().min(0).max(100);
export const nineBoxConfigSchema = z
  .object({
    x_medium_from: bounded,
    x_high_from: bounded,
    y_medium_from: bounded,
    y_high_from: bounded,
    training_hours_target: z.number().positive().max(10000),
    award_mode: z.enum(['HIGHEST', 'CAPPED_SUM']),
    assessment_source: z.enum(['ADMIN', 'DNA']),
    education_scores: z.object(
      Object.fromEntries(educationLevels.map((level) => [level, bounded])) as Record<
        (typeof educationLevels)[number],
        typeof bounded
      >,
    ),
  })
  .refine(
    (c) =>
      c.x_medium_from > 0 &&
      c.x_medium_from < c.x_high_from &&
      c.x_high_from <= 100 &&
      c.y_medium_from > 0 &&
      c.y_medium_from < c.y_high_from &&
      c.y_high_from <= 100,
    { message: 'Batas rendah, sedang dan tinggi harus berurutan dan tidak sama.' },
  );
export type NineBoxConfig = z.infer<typeof nineBoxConfigSchema>;
export const nineBoxInputSchema = z
  .object({
    assessment_score: bounded.nullable(),
    assessment_source: z.string().trim().max(240),
    assessment_date: z.iso.date().nullable(),
    education_level: z.enum(educationLevels).nullable(),
    field_match: z.boolean().nullable(),
    field_match_note: z.string().trim().max(1000),
  })
  .refine(
    (d) =>
      d.assessment_score === null ||
      (d.assessment_source.length >= 3 && d.assessment_date !== null),
    { message: 'Nilai asesmen memerlukan sumber dan tanggal asesmen.' },
  )
  .refine((d) => d.field_match === null || d.field_match_note.length >= 3, {
    message: 'Isi dasar penilaian kesesuaian bidang ilmu.',
  });
export type NineBoxInput = z.infer<typeof nineBoxInputSchema>;
