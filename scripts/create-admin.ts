import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { connectDb, migrate } from '../server/db/index.ts';
import { hashPassword } from '../server/security.ts';
import { audit } from '../server/http.ts';
const data = z
  .object({ username: z.string().trim().min(3).max(100), password: z.string().min(16).max(128) })
  .parse({ username: process.env.BOOTSTRAP_USERNAME, password: process.env.BOOTSTRAP_PASSWORD });
const db = await connectDb();
try {
  await migrate(db);
  const hash = await hashPassword(data.password);
  await db.transaction(async (tx) => {
    await tx.query('LOCK TABLE users IN EXCLUSIVE MODE');
    if ((await tx.query("SELECT id FROM users WHERE role='SUPER_ADMIN'")).length)
      throw new Error('A Super Admin already exists. Use account management for further access.');
    const id = randomUUID();
    await tx.query(
      "INSERT INTO users(id,username,password_hash,role) VALUES($1,$2,$3,'SUPER_ADMIN')",
      [id, data.username, hash],
    );
    await audit(tx, null, 'SUPER_ADMIN_BOOTSTRAP', `users/${id}`);
  });
  console.log('Super Admin created. Password change required at first login.');
} finally {
  await db.close();
}
