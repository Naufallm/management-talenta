import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, LogOut, UserRound, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../lib/context';
import { post } from '../lib/api';
import { useFeedback } from './ui';
import { EmployeeAvatar } from './EmployeeAvatar';
import type { Role } from '../../shared/contracts';

const labels: Record<Role, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  PEGAWAI: 'Pegawai',
};
export function AccountMenu() {
  const { user, logout, refresh } = useAuth();
  const { run } = useFeedback();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  if (!user) return null;
  return (
    <div
      className="account-menu"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="account-trigger"
        aria-label="Menu profil"
        aria-expanded={open}
        aria-controls="account-dropdown"
        onClick={() => setOpen(!open)}
      >
        <EmployeeAvatar size="small" employeeId={user.employee_id} version={user.photo_version} />
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="account-dropdown" id="account-dropdown">
          <div className="account-heading">
            <strong>{user.name}</strong>
            <small>{labels[user.role]}</small>
          </div>
          <Link to={user.employee_id ? '/profil' : '/akun'} onClick={() => setOpen(false)}>
            <UserRound size={17} />
            {user.employee_id ? 'Lihat profil' : 'Pengaturan akun'}
          </Link>
          <Link to="/akun" onClick={() => setOpen(false)}>
            <KeyRound size={17} />
            Ganti kata sandi
          </Link>
          <div className="account-roles">
            <p>
              <ShieldCheck size={15} />
              Ganti role
            </p>
            {(['PEGAWAI', 'SUPERVISOR', 'ADMIN'] as Role[])
              .filter((role) => (user.roles || [user.role]).includes(role))
              .map((role) => (
                <button
                  type="button"
                  key={role}
                  disabled={busy || user.role === role}
                  aria-pressed={user.role === role}
                  onClick={() =>
                    void run(async () => {
                      setBusy(true);
                      try {
                        await post('/auth/role', { role });
                        await refresh();
                        setOpen(false);
                        navigate('/dashboard', { replace: true });
                      } finally {
                        setBusy(false);
                      }
                    })
                  }
                >
                  {labels[role]}
                  {user.role === role && <Check size={16} />}
                </button>
              ))}
          </div>
          <button type="button" className="account-logout" onClick={() => void run(logout)}>
            <LogOut size={17} />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
