import { randomUUID } from 'node:crypto';
import type { DB } from './db/index.ts';
import { hashPassword } from './security.ts';
import { audit } from './http.ts';
import { assert } from './errors.ts';
import { testingPassword, testingAccounts, testingLoginEnabled } from './testing-policy.ts';
export { testingPassword, testingAccounts, testingLoginEnabled } from './testing-policy.ts';
const resetRevision = 'work/testing-login-v1';

/** Apply the work-branch testing credentials once, preserving every user's database ID. */
export async function prepareTestingAccounts(db: DB, force = false) {
  assert(testingLoginEnabled(), 403, 'Login testing tidak aktif pada environment ini.');
  const hash = await hashPassword(testingPassword);
  return db.transaction(async (tx) => {
    await tx.query('LOCK TABLE users IN EXCLUSIVE MODE');
    if (
      !force &&
      (
        await tx.query('SELECT id FROM audit_logs WHERE action=$1 AND resource=$2 LIMIT 1', [
          'TEST_ACCOUNTS_RESET',
          resetRevision,
        ])
      ).length
    ) {
      return { reset: false, total: 0 };
    }
    for (const account of testingAccounts) {
      const [existing] = await tx.query(
        `SELECT id,role FROM users WHERE username=$1 OR (role=$2 AND (id=$3 OR username=$4))
         ORDER BY CASE WHEN username=$1 THEN 0 WHEN id=$3 THEN 1 ELSE 2 END LIMIT 1`,
        [account.username, account.role, account.id, account.legacyUsername],
      );
      assert(
        !existing || existing.role === account.role,
        409,
        'Email akun testing sudah digunakan oleh peran lain.',
      );
      if (existing)
        await tx.query('UPDATE users SET username=$1,active=true WHERE id=$2', [
          account.username,
          existing.id,
        ]);
      else
        await tx.query(
          'INSERT INTO users(id,username,password_hash,role,must_change_password) VALUES($1,$2,$3,$4,false)',
          [randomUUID(), account.username, hash, account.role],
        );
    }
    const users = await tx.query(
      'UPDATE users SET password_hash=$1,must_change_password=false RETURNING id',
      [hash],
    );
    await tx.query('DELETE FROM sessions');
    await audit(tx, null, 'TEST_ACCOUNTS_RESET', resetRevision, { total: users.length });
    return { reset: true, total: users.length };
  });
}
