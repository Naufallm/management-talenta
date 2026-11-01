import { useState } from 'react';
import { ArrowRight, ShieldCheck, Eye, EyeOff, UserRoundCheck } from 'lucide-react';
import { useAuth, useApi } from '../lib/context';
import { post, setCsrf } from '../lib/api';
import { Brand } from '../components/Layout';
import { Form, Field, PageHeader, Panel, string, useFeedback, Button } from '../components/ui';
import type { LoginOptions, QuickLoginAccount } from '../../shared/contracts';
export function Login() {
  const { refresh, error } = useAuth(),
    [visible, setVisible] = useState(false),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [submitting, setSubmitting] = useState(false),
    [selectedEmployee, setSelectedEmployee] = useState(''),
    options = useApi<LoginOptions>('/auth/options'),
    { run } = useFeedback();
  const signIn = async (account: string, secret: string) => {
    setUsername(account);
    setPassword(secret);
    setSubmitting(true);
    try {
      const result = await post('/auth/login', { username: account, password: secret });
      setCsrf(result.csrfToken);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };
  const quickLogin = (account: QuickLoginAccount) =>
    void run(() => signIn(account.username, options.data!.password!));
  const employees = options.data?.accounts.filter((account) => account.role === 'PEGAWAI') || [];
  return (
    <div className="login">
      <section className="login-story">
        <Brand />
        <div className="login-copy">
          <div className="login-rule" />
          <span className="eyebrow">BPS KOTA BATU</span>
          <h1>
            Ruang untuk
            <br />
            talenta bertumbuh.
          </h1>
          <p>Kenali potensi, kembangkan kompetensi, dan bangun masa depan bersama.</p>
          <div className="login-pill">
            <ShieldCheck size={17} />
            Akses terkelola. Data terlindungi.
          </div>
        </div>
        <small>Sistem Manajemen Talenta Pegawai</small>
      </section>
      <main className="login-form">
        <div>
          <span className="eyebrow">SELAMAT DATANG</span>
          <h2>Masuk ke Talenta</h2>
          <p>Gunakan akun yang diberikan oleh pengelola.</p>
          {error && <p className="form-error">{error}</p>}
          <Form
            submit="Masuk ke akun"
            disabled={submitting}
            onSubmit={(d) => signIn(string(d, 'username'), string(d, 'password'))}
          >
            <Field label="NIP atau email">
              <input
                name="username"
                autoComplete="username"
                placeholder="Masukkan NIP / email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                maxLength={100}
              />
            </Field>
            <Field label="Kata sandi">
              <div className="password-input">
                <input
                  name="password"
                  aria-label="Kata sandi"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
          </Form>
          <p className="login-help">Lupa kata sandi? Hubungi Admin untuk pemulihan akun.</p>
          {options.data?.testingLogin && (
            <section className="quick-login" aria-labelledby="quick-login-title">
              <div className="quick-login-heading">
                <h3 id="quick-login-title">Login cepat</h3>
                <span>Testing</span>
              </div>
              <p>
                Pilih akun untuk langsung masuk. Kata sandi: <code>{options.data.password}</code>
              </p>
              <div className="quick-login-roles">
                {options.data.accounts
                  .filter((account) => account.role !== 'PEGAWAI')
                  .map((account) => (
                    <Button
                      key={account.username}
                      type="button"
                      variant="secondary"
                      disabled={submitting}
                      onClick={() => quickLogin(account)}
                      aria-label={`Masuk sebagai ${account.role === 'ADMIN' ? 'Admin' : 'Supervisor'}`}
                    >
                      {account.role === 'ADMIN' ? (
                        <ShieldCheck size={18} />
                      ) : (
                        <UserRoundCheck size={18} />
                      )}
                      <span>
                        <strong>{account.role === 'ADMIN' ? 'Admin' : 'Supervisor'}</strong>
                        <small>{account.username}</small>
                      </span>
                      <ArrowRight size={15} />
                    </Button>
                  ))}
              </div>
              {employees.length > 0 && (
                <div className="quick-login-employee">
                  <Field label="Login cepat pegawai">
                    <select
                      disabled={submitting}
                      value={selectedEmployee || employees[0].username}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                    >
                      {employees.map((account) => (
                        <option key={account.username} value={account.username}>
                          {account.name} · {account.username}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submitting}
                    onClick={() =>
                      quickLogin(
                        employees.find((a) => a.username === selectedEmployee) || employees[0],
                      )
                    }
                  >
                    Masuk sebagai Pegawai
                    <ArrowRight size={15} />
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>
        <small>© {new Date().getFullYear()} BPS Kota Batu</small>
      </main>
    </div>
  );
}
export function Password({ forced = false }: { forced?: boolean }) {
  const { refresh, logout } = useAuth(),
    { notify, run } = useFeedback();
  return (
    <div className={forced ? 'forced-password' : ''}>
      <PageHeader
        title={forced ? 'Buat kata sandi baru' : 'Pengaturan Akun'}
        description={
          forced
            ? 'Untuk mulai menggunakan Talenta, ganti kata sandi awal Anda.'
            : 'Perbarui kata sandi untuk menjaga keamanan akun.'
        }
      />
      <Panel title="Ganti kata sandi" className="narrow">
        <Form
          submit="Perbarui kata sandi"
          onSubmit={async (d) => {
            if (string(d, 'password') !== string(d, 'confirm'))
              throw new Error('Konfirmasi kata sandi tidak sama.');
            const result = await post('/auth/password', {
              currentPassword: string(d, 'currentPassword'),
              password: string(d, 'password'),
            });
            setCsrf(result.csrfToken);
            await refresh();
            notify('Kata sandi berhasil diperbarui.');
          }}
        >
          <Field label="Kata sandi saat ini">
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </Field>
          <Field
            label="Kata sandi baru"
            hint="Gunakan minimal 12 karakter. Hindari NIP dan informasi pribadi."
          >
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </Field>
          <Field label="Konfirmasi kata sandi baru">
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </Field>
        </Form>
      </Panel>
      {forced && (
        <Button variant="ghost" onClick={() => void run(logout)}>
          Keluar dari akun
        </Button>
      )}
    </div>
  );
}
