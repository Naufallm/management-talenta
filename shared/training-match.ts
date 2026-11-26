// Only documented topic families produce a suggestion. Unrecognised titles need review.
const domains = [
  {
    role: /statistisi|statistikawan|analis data|pengolah data/,
    topic:
      /statistik|survei|sensus|sampling|analisis data|kualitas data|visualisasi|dashboard|spreadsheet|pengolahan data/,
  },
  {
    role: /pranata komputer|informatika|teknologi informasi/,
    topic:
      /keamanan informasi|jaringan|pemrograman|basis data|database|dashboard|spreadsheet|pengolahan data/,
  },
  { role: /keuangan|bendahara|akuntan/, topic: /anggaran|perbendaharaan|akuntansi|perpajakan/ },
  {
    role: /kepegawaian|analis sdm|sumber daya manusia/,
    topic: /kepegawaian|manajemen talenta|pengembangan sdm/,
  },
];

export function suggestTrainingMatch(position: string, title: string): boolean | null {
  const role = position.trim().toLowerCase();
  const course = title.trim().toLowerCase();
  if (!role || !course) return null;
  if (/pelayanan publik|komunikasi pelayanan|kolaborasi|manajemen tim/.test(course)) return true;
  const relevant = domains.filter((d) => d.role.test(role));
  if (relevant.some((d) => d.topic.test(course))) return true;
  if (relevant.length && domains.some((d) => d.topic.test(course))) return false;
  return null;
}
