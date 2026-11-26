import type { DnaCluster, DnaLevel } from '../../shared/potential-dna.ts';

const statements: [DnaCluster, string][] = [
  ['ACTION', 'Saya selalu membuat rencana kerja tertulis sebelum memulai tugas yang rumit.'],
  [
    'ACTION',
    'Saya merasa terganggu jika prosedur kerja yang sudah disepakati diubah secara mendadak.',
  ],
  [
    'ACTION',
    'Ketika melihat sebuah sistem berjalan tidak efisien, saya langsung mencari cara untuk memperbaikinya.',
  ],
  [
    'ACTION',
    'Saya lebih suka menyelesaikan satu pekerjaan hingga tuntas sebelum berpindah ke pekerjaan lain.',
  ],
  [
    'ACTION',
    'Saya selalu memeriksa ulang hasil kerja saya untuk memastikan tidak ada kesalahan sekecil apa pun.',
  ],
  [
    'ACTION',
    'Saya merasa nyaman bekerja dalam situasi yang memiliki aturan dan birokrasi yang ketat.',
  ],
  ['ACTION', 'Saya lebih mengutamakan hasil akhir yang sempurna daripada proses kerja yang cepat.'],
  [
    'ACTION',
    'Ketika rencana awal saya gagal, saya dapat dengan mudah beralih ke rencana alternatif tanpa merasa panik.',
  ],
  [
    'ACTION',
    'Saya senang membongkar suatu masalah hingga ke akar-akarnya untuk mengetahui penyebab utama kegagalan.',
  ],
  ['ACTION', 'Saya merasa puas jika pekerjaan saya terdokumentasi dengan rapi dan sistematis.'],
  ['DRIVE', 'Saya selalu mencari data dan fakta yang valid sebelum menarik sebuah kesimpulan.'],
  [
    'DRIVE',
    'Saya tertantang untuk menyelesaikan tugas-tugas yang belum pernah dicoba oleh orang lain.',
  ],
  [
    'DRIVE',
    'Saya sering merenungkan keputusan masa lalu untuk menjadi bahan pelajaran di masa depan.',
  ],
  [
    'DRIVE',
    'Saya merasa bersemangat ketika diberi target kerja yang lebih tinggi dari pencapaian sebelumnya.',
  ],
  [
    'DRIVE',
    'Saya lebih mempercayai hasil analisis logika penalaran daripada sekadar intuisi atau perasaan.',
  ],
  ['DRIVE', 'Saya suka menghabiskan waktu sendirian untuk memikirkan ide-ide baru yang abstrak.'],
  [
    'DRIVE',
    'Saya merasa cemas jika hari ini saya tidak mempelajari keterampilan atau pengetahuan baru.',
  ],
  [
    'DRIVE',
    'Saya selalu ingin tahu latar belakang atau sejarah dari suatu kebijakan sebelum melaksanakannya.',
  ],
  [
    'DRIVE',
    'Saya tetap teguh pada pendirian saya meskipun mayoritas orang di sekitar saya tidak setuju.',
  ],
  [
    'DRIVE',
    'Saya merasa termotivasi ketika hasil kerja saya diakui dan mendapat apresiasi secara publik.',
  ],
  [
    'NETWORK',
    'Saya mudah memulai percakapan akrab dengan orang yang baru pertama kali saya temui.',
  ],
  ['NETWORK', 'Saya cenderung mengalah dalam perdebatan demi menjaga keharmonisan kelompok.'],
  ['NETWORK', 'Saya senang membantu rekan kerja mengembangkan potensi dan kemampuan mereka.'],
  [
    'NETWORK',
    'Saya selalu memperlakukan semua orang dengan standar keadilan yang sama tanpa pandang bulu.',
  ],
  [
    'NETWORK',
    'Saya mampu merasakan beban emosional atau kesulitan yang sedang dialami oleh rekan tim saya.',
  ],
  [
    'NETWORK',
    'Saya lebih suka bekerja secara mandiri daripada harus berkoordinasi dalam kelompok besar.',
  ],
  [
    'NETWORK',
    'Saya sering menjadi penengah ketika terjadi konflik atau perbedaan pendapat di antara teman-teman.',
  ],
  ['NETWORK', 'Saya merasa nyaman memimpin dan mengarahkan orang lain dalam sebuah proyek kerja.'],
  [
    'NETWORK',
    'Saya sangat berhati-hati dalam berbicara agar tidak menyinggung perasaan orang lain.',
  ],
  [
    'NETWORK',
    'Saya senang melibatkan banyak orang untuk meminta masukan sebelum mengambil keputusan penting.',
  ],
];
export const dnaQuestions = statements.map(([cluster, text], index) => ({
  id: `dna-${String(index + 1).padStart(2, '0')}`,
  number: index + 1,
  cluster,
  text,
}));

// The seven rows below reproduce the four-formation comparison table. No extra
// rows from the separate two-role table are double-counted in the fit score.
export const dnaAspects: {
  name: string;
  detail: string;
  numbers: [number, number];
  ideals: [DnaLevel, DnaLevel, DnaLevel, DnaLevel];
}[] = [
  {
    name: 'Rencana & ketelitian',
    detail: 'Order & Precision',
    numbers: [1, 5],
    ideals: ['Sangat tinggi', 'Tinggi', 'Moderat tinggi', 'Moderat'],
  },
  {
    name: 'Patuh aturan & keadilan',
    detail: 'Objectivity & Rules',
    numbers: [6, 24],
    ideals: ['Tinggi', 'Moderat', 'Moderat tinggi', 'Tinggi'],
  },
  {
    name: 'Pemecahan masalah',
    detail: 'Problem Solving',
    numbers: [3, 9],
    ideals: ['Tinggi', 'Sangat tinggi', 'Moderat', 'Tinggi'],
  },
  {
    name: 'Logika & fakta',
    detail: 'Evidence-based',
    numbers: [11, 15],
    ideals: ['Sangat tinggi', 'Sangat tinggi', 'Sangat tinggi', 'Moderat'],
  },
  {
    name: 'Ide baru',
    detail: 'Creativity',
    numbers: [12, 16],
    ideals: ['Moderat', 'Sangat tinggi', 'Rendah', 'Tinggi'],
  },
  {
    name: 'Kolaborasi & empati',
    detail: 'Interpersonal',
    numbers: [23, 25],
    ideals: ['Moderat', 'Rendah', 'Moderat', 'Sangat tinggi'],
  },
  {
    name: 'Mediasi & komunikasi',
    detail: 'Harmony & Team',
    numbers: [27, 30],
    ideals: ['Moderat', 'Rendah', 'Moderat', 'Sangat tinggi'],
  },
];
