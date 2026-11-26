import './ErrorPage.css';

export function ErrorPage({
  unexpected = false,
  homeHref = '/dashboard',
  onRetry,
}: {
  unexpected?: boolean;
  homeHref?: string;
  onRetry?: () => void;
}) {
  return (
    <main className={`error-page${unexpected ? ' fatal-error' : ''}`}>
      <img src="/assets/uko-error-monitor.png" alt="" width="1448" height="1086" />
      <div className="error-page-copy">
        <h1>{unexpected ? 'Oops, terjadi kendala.' : 'Ooops... 404!'}</h1>
        <p>
          {unexpected
            ? 'Halaman belum dapat dimuat. Silakan coba kembali.'
            : 'Halaman yang Anda cari tidak ditemukan.'}
        </p>
      </div>
      <div className="error-page-actions">
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            Muat ulang
          </button>
        )}
        <a href={homeHref}>{homeHref === '/' ? 'Kembali ke beranda' : 'Kembali ke dashboard'}</a>
      </div>
    </main>
  );
}
