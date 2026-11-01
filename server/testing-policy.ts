export const testingPassword = '123456';
export const testingAccounts = [
  { id: 'user-admin', username: 'admin@bpskotabatu.com', legacyUsername: 'admin', role: 'ADMIN' },
  {
    id: 'user-supervisor',
    username: 'supervisor@bpskotabatu.com',
    legacyUsername: 'supervisor',
    role: 'SUPERVISOR',
  },
] as const;

export function testingLoginEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.TEST_LOGIN_ENABLED !== 'false';
}
