import { connectDb, migrate } from '../server/db/index.ts';
import { prepareTestingAccounts, testingLoginEnabled } from '../server/testing-auth.ts';

if (!testingLoginEnabled())
  throw new Error(
    'Reset akun testing hanya tersedia saat TEST_LOGIN_ENABLED aktif di luar produksi.',
  );
const db = await connectDb();
try {
  await migrate(db);
  const result = await prepareTestingAccounts(db, true);
  console.log(
    `${result.total} akun testing direset. Admin: admin@bpskotabatu.com; Supervisor: supervisor@bpskotabatu.com. Lihat README untuk kredensial testing.`,
  );
} finally {
  await db.close();
}
