import { Link } from 'react-router-dom';

export function Brand({ to = '/', publicSite = false }: { to?: string; publicSite?: boolean }) {
  return (
    <Link
      className={`brand${publicSite ? ' public-brand' : ''}`}
      to={to}
      aria-label={'Talenta BPS · BPS Kota Batu'}
    >
      <img src="/assets/logo-bps.png" alt="Logo BPS" width="661" height="509" />
      <span>
        <strong>Talenta BPS</strong>
        <small>BPS Kota Batu</small>
      </span>
    </Link>
  );
}
