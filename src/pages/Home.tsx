import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUp, Check, LogIn, LayoutDashboard, ChevronUp } from 'lucide-react';
import { Brand } from '../components/Brand';
import { useAuth } from '../lib/context';
import { boxGrid, boxInfo } from '../../shared/nine-box';
import './Home.css';

function QuadrantExplorer() {
  const [selected, setSelected] = useState(9);
  const info = boxInfo(selected);
  return (
    <div className="public-map" data-ui aria-label="Ilustrasi matriks sembilan box">
      <div className="public-map-heading">
        <h2>Peta pengembangan</h2>
        <span>9 box talenta</span>
      </div>
      <p className="public-map-instruction">Pilih box untuk mengenali arah pengembangannya.</p>
      <div className="public-map-chart">
        <div className="public-map-y">
          <span>Kinerja</span>
          <ArrowUp size={15} />
        </div>
        <div className="public-nine-boxes" role="group" aria-label="Pilih box talenta">
          {boxGrid.flat().map((id) => (
            <button
              key={id}
              className={
                'public-nine-box ' + boxInfo(id).group + (selected === id ? ' selected' : '')
              }
              aria-label={`Box ${id}, ${boxInfo(id).title}`}
              aria-pressed={selected === id}
              onClick={() => setSelected(id)}
            >
              <strong>{id}</strong>
              <span>{boxInfo(id).title}</span>
              {selected === id && <Check size={13} />}
            </button>
          ))}
        </div>
        <div className="public-map-x">
          <span>Rendah</span>
          <strong>
            Potensial <ArrowRight size={15} />
          </strong>
          <span>Tinggi</span>
        </div>
      </div>
      <div aria-live="polite">
        <div className="public-map-explanation" key={selected}>
          <h3>
            Box {info.id} - {info.title}
          </h3>
          <p>{info.description}</p>
        </div>
      </div>
      <p className="public-map-note">
        Ilustrasi pemetaan. Batas kategori mengikuti konfigurasi periode penilaian.
      </p>
    </div>
  );
}

export function Home() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('beranda');
  const destination = user ? '/dashboard' : '/login';
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Talenta BPS — BPS Kota Batu';
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActiveSection(entry.target.id);
      },
      { rootMargin: '-15% 0px -65% 0px' },
    );
    for (const id of ['beranda', 'tentang-kami']) {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    }
    return () => {
      document.title = previousTitle;
      sectionObserver.disconnect();
    };
  }, []);
  return (
    <div className="public-site">
      <a className="skip-link" href="#public-main">
        Lewati ke konten utama
      </a>
      <header className="public-header">
        <div className="public-container public-header-inner">
          <Brand publicSite />
          <nav aria-label="Navigasi beranda" className="public-nav">
            <a href="#beranda" aria-current={activeSection === 'beranda' ? 'location' : undefined}>
              Beranda
            </a>
            <a
              href="#tentang-kami"
              aria-current={activeSection === 'tentang-kami' ? 'location' : undefined}
            >
              Tentang Kami
            </a>
          </nav>
          <Link className="public-button public-header-login" to={destination}>
            {user ? 'Dashboard' : 'Masuk'}{' '}
            {user ? (
              <LayoutDashboard size={17} aria-hidden="true" />
            ) : (
              <LogIn size={17} aria-hidden="true" />
            )}
          </Link>
        </div>
      </header>
      <main id="public-main">
        <section id="beranda" className="public-hero" aria-labelledby="public-title">
          <div className="public-container public-hero-grid">
            <div className="public-hero-copy">
              <h1 id="public-title" data-reveal>
                Talenta BPS
              </h1>
              <p data-reveal>
                Sistem manajemen talenta BPS Kota Batu memetakan potensi dan kinerja pegawai untuk
                menentukan arah pengembangan.
              </p>
              <div className="public-hero-actions" data-reveal>
                <Link className="public-button" to={destination}>
                  {user ? 'Buka dashboard' : 'Masuk ke Talenta BPS'}
                  {user ? (
                    <LayoutDashboard size={18} aria-hidden="true" />
                  ) : (
                    <LogIn size={18} aria-hidden="true" />
                  )}
                </Link>
                <a className="public-text-link" href="#tentang-kami">
                  Kenali sistemnya
                </a>
              </div>
            </div>
            <div className="public-hero-visual">
              <QuadrantExplorer />
            </div>
          </div>
        </section>
        <section id="tentang-kami" className="public-about" aria-labelledby="public-about-title">
          <div className="public-container public-about-grid">
            <div className="public-about-copy">
              <h2 id="public-about-title" data-reveal>
                Tentang kami
              </h2>
              <p data-reveal>
                Talenta BPS menyatukan informasi asesmen dan bukti kompetensi untuk membantu
                memahami kebutuhan pengembangan pegawai.
              </p>
              <p data-reveal>
                Matriks sembilan box mempertemukan potensial pada sumbu horizontal dan kinerja pada
                sumbu vertikal. Setiap posisi menjadi dasar percakapan tentang pembelajaran,
                pendampingan, dan penugasan yang sesuai.
              </p>
            </div>
            <dl className="public-dimensions">
              <div data-reveal>
                <dt>
                  <span className="public-dimension-mark potential" aria-hidden="true" />
                  Potensi
                </dt>
                <dd>
                  Asesmen DNA, pelatihan, pengalaman jabatan, pendidikan, dan kesesuaian bidang
                  ilmu.
                </dd>
              </div>
              <div data-reveal>
                <dt>
                  <span className="public-dimension-mark competency" aria-hidden="true" />
                  Kinerja
                </dt>
                <dd>
                  CKP tahun berjalan dan penghargaan terverifikasi, dipadukan dengan penilaian Ketua
                  Tim.
                </dd>
              </div>
              <div data-reveal>
                <dt>
                  <span className="public-dimension-mark performance" aria-hidden="true" />
                  Capaian Kinerja Pegawai
                </dt>
                <dd>Rata-rata capaian kinerja bulanan menyumbang 70% pada sumbu kinerja.</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="public-process public-container" aria-labelledby="public-process-title">
          <div className="public-section-heading">
            <h2 id="public-process-title" data-reveal>
              Dari data ke pengembangan
            </h2>
          </div>
          <ol className="public-steps">
            <li data-reveal>
              <h3>Lengkapi asesmen</h3>
              <p>
                Pegawai mengisi asesmen potensi dan melengkapi bukti pengembangan sesuai periode
                penilaian.
              </p>
            </li>
            <li data-reveal>
              <h3>Petakan talenta</h3>
              <p>
                Potensial dan kinerja membentuk posisi pada sembilan box berdasarkan konfigurasi
                penilaian yang berlaku.
              </p>
            </li>
            <li data-reveal>
              <h3>Tentukan arah</h3>
              <p>
                Peta talenta dan riwayat penilaian membantu mengarahkan pembelajaran serta
                pendampingan berikutnya.
              </p>
            </li>
          </ol>
        </section>
        <section className="public-invitation" aria-labelledby="public-invitation-title">
          <div className="public-container public-invitation-inner">
            <div>
              <h2 id="public-invitation-title" data-reveal>
                Kenali potensi Anda
              </h2>
              <p data-reveal>Mulai dari asesmen, lanjutkan dengan pengembangan yang terarah.</p>
            </div>
            <Link className="public-button public-button-light" to={destination} data-reveal>
              {user ? 'Buka dashboard' : 'Masuk ke Talenta BPS'}
              {user ? (
                <LayoutDashboard size={18} aria-hidden="true" />
              ) : (
                <LogIn size={18} aria-hidden="true" />
              )}
            </Link>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <div className="public-container public-footer-inner">
          <Brand publicSite />
          <p>© {new Date().getFullYear()} Badan Pusat Statistik Kota Batu</p>
          <a href="#beranda">
            Kembali ke atas <ChevronUp size={16} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  );
}
