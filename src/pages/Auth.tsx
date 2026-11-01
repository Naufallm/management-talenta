import { useState } from 'react';
import { ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/context';
import { post, setCsrf } from '../lib/api';
import { Brand } from '../components/Layout';
import { Form, Field, PageHeader, Panel, string, useFeedback, Button } from '../components/ui';
export function Login() {
  const { refresh, error } = useAuth(),
    [visible, setVisible] = useState(false);
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
            onSubmit={async (d) => {
              const result = await post('/auth/login', {
                username: string(d, 'username'),
                password: string(d, 'password'),
              });
              setCsrf(result.csrfToken);
              await refresh();
            }}
          >
            <Field label="NIP atau nama akun">
              <input
                name="username"
                autoComplete="username"
                placeholder="Masukkan NIP / akun"
                required
                autoFocus
                maxLength={100}
              />
            </Field>
            <Field label="Kata sandi">
              <div className="password-input">
                <input
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                  maxLength={128}
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
          <p className="login-help">Lupa kata sandi? Hubungi Super Admin untuk pemulihan akun.</p>
          {import.meta.env.DEV && (
            <details className="dev-accounts">
              <summary>
                Akun pengembangan <ArrowRight size={13} />
              </summary>
              <p>
                Super Admin: <code>superadmin</code>
                <br />
                Admin: <code>admin</code>
                <br />
                Pegawai: <code>199001012020011001</code>
                <br />
                Kata sandi awal: <code>TalentaDev!2026</code>
                <br />
                Seluruh data seed adalah fiktif. Kata sandi wajib diganti saat masuk pertama kali.
              </p>
            </details>
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
