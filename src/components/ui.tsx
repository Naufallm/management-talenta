import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useId,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">MANAJEMEN TALENTA</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </header>
  );
}
export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Empty({
  title = 'Belum ada data',
  description = 'Data akan tampil setelah ditambahkan.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function State({
  loading,
  error,
  retry,
  children,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
  children?: ReactNode;
}) {
  if (loading)
    return (
      <div className="loading" role="status">
        <LoaderCircle className="spin" size={22} /> Memuat data…
      </div>
    );
  if (error)
    return (
      <div className="error-state" role="alert">
        <AlertCircle size={22} />
        <p>{error}</p>
        {retry && (
          <Button variant="secondary" onClick={retry}>
            Coba lagi
          </Button>
        )}
      </div>
    );
  return <>{children}</>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const native =
    isValidElement(children) &&
    typeof children.type === 'string' &&
    ['input', 'select', 'textarea'].includes(children.type);
  const control = native
    ? cloneElement(children as ReactElement<any>, {
        'aria-labelledby': id,
        'aria-describedby': hint ? `${id}-hint` : undefined,
      })
    : children;
  return (
    <label className="field">
      <span id={id}>{label}</span>
      {control}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </label>
  );
}
export function Form({
  children,
  onSubmit,
  submit = 'Simpan',
  cancel,
  disabled = false,
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  submit?: string;
  cancel?: () => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          await onSubmit(d);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || disabled} className="form-fields">
        {children}
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        {cancel && (
          <Button type="button" variant="secondary" disabled={busy} onClick={cancel}>
            Batal
          </Button>
        )}
        <Button type="submit" disabled={busy || disabled}>
          {busy && <LoaderCircle className="spin" size={16} />} {busy ? 'Menyimpan…' : submit}
        </Button>
      </div>
    </form>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      d?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <Button variant="ghost" aria-label="Tutup dialog" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
type ConfirmOptions = { title: string; description: string; label?: string; danger?: boolean };
const FeedbackContext = createContext<{
  notify: (message: string) => void;
  run: <T>(fn: () => Promise<T>, success?: string) => Promise<T | undefined>;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
}>({ notify: () => {}, run: async () => undefined, confirm: async () => false });
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null),
    [confirmation, setConfirmation] = useState<
      (ConfirmOptions & { resolve: (v: boolean) => void }) | null
    >(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (message: string) => setToast({ message });
  async function run<T>(fn: () => Promise<T>, success?: string) {
    try {
      const result = await fn();
      if (success) notify(success);
      return result;
    } catch (e) {
      setToast({ message: (e as Error).message, error: true });
    }
  }
  const confirm = (o: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setConfirmation({ ...o, resolve }));
  const finish = (value: boolean) => {
    confirmation?.resolve(value);
    setConfirmation(null);
  };
  return (
    <FeedbackContext.Provider value={{ notify, run, confirm }}>
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? 'toast-error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
          <button aria-label="Tutup pemberitahuan" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {confirmation && (
        <Dialog title={confirmation.title} onClose={() => finish(false)}>
          <p>{confirmation.description}</p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => finish(false)}>
              Batal
            </Button>
            <Button
              variant={confirmation.danger ? 'danger' : 'primary'}
              onClick={() => finish(true)}
            >
              {confirmation.label || 'Lanjutkan'}
            </Button>
          </div>
        </Dialog>
      )}
    </FeedbackContext.Provider>
  );
}
export const useFeedback = () => useContext(FeedbackContext);
export function Pagination({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (v: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} dari ${total} data`
          : '0 data'}
      </span>
      <div>
        <Button
          variant="secondary"
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span>
          {page} / {pages}
        </span>
        <Button
          variant="secondary"
          aria-label="Halaman berikutnya"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export const number = (value: number | null | undefined) =>
  value == null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
export const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(
        new Date(value),
      )
    : '—';
export const string = (d: FormData, key: string) => String(d.get(key) || '');
export function Tabs({
  items,
  active,
  onChange,
}: {
  items: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          tabIndex={0}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
