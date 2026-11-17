import { useEffect, useState, type CSSProperties } from 'react';
import { DEMO_NOTICE } from '@weblead/agent-designer';
import { getTemplate } from '@weblead/website-templates';
import type { GeneratedWebsiteContent } from '@weblead/website-generator';
import { GENERATED_DEMOS, type GeneratedDemo } from './data/generated-demos.js';
import PasswordGate from './PasswordGate.js';

/** Slug from the path: /demos/{slug}. No router dep. */
function slugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/demos\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setSeo(title: string, description: string) {
  document.title = title;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', description);
}

/**
 * Contacto directo, sin formulario (rediseño 2026-11-17, orden de Jon):
 * teléfono (tel:), email (mailto:), dirección y enlace a Google Maps.
 * Nada de campos, nada de "Enviar".
 */
function ContactCard({ content }: { content: GeneratedWebsiteContent }) {
  return (
    <div className="contact-card">
      <address>
        {content.contact.address ? (
          <p className="contact-row">
            <span className="contact-label">Dirección</span>
            <span>
              {content.contact.address}
              {content.contact.mapsHref ? (
                <a
                  className="maps-link"
                  href={content.contact.mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver en Google Maps ↗
                </a>
              ) : null}
            </span>
          </p>
        ) : null}
        {content.contact.phoneHref ? (
          <p className="contact-row">
            <span className="contact-label">Teléfono</span>
            <a className="contact-value" href={content.contact.phoneHref}>
              {content.contact.phone}
            </a>
          </p>
        ) : null}
        {content.contact.email ? (
          <p className="contact-row">
            <span className="contact-label">Email</span>
            <a className="contact-value" href={`mailto:${content.contact.email}`}>
              {content.contact.email}
            </a>
          </p>
        ) : null}
        {content.contact.whatsappHref ? (
          <p className="contact-row">
            <span className="contact-label">WhatsApp</span>
            <a className="contact-value" href={content.contact.whatsappHref}>
              Escribir por WhatsApp
            </a>
          </p>
        ) : null}
      </address>
      <p className="contact-note">
        Contacto directo con la empresa por teléfono o email.
      </p>
    </div>
  );
}

function HeroCtas({ content }: { content: GeneratedWebsiteContent }) {
  return (
    <div className="demo-cta">
      {content.contact.phoneHref ? (
        <a className="cta-primary" href={content.contact.phoneHref}>
          {content.hero.ctaLabel}
        </a>
      ) : null}
      {content.contact.whatsappHref ? (
        <a className="cta-secondary" href={content.contact.whatsappHref}>
          WhatsApp
        </a>
      ) : null}
      {content.contact.mapsHref ? (
        <a className="cta-secondary" href={content.contact.mapsHref} target="_blank" rel="noopener noreferrer">
          Cómo llegar
        </a>
      ) : null}
    </div>
  );
}

function Hero({ content }: { content: GeneratedWebsiteContent }) {
  const heroImage = content.gallery.images.find((i) => i.placement === 'hero');
  const layout = content.brand.heroLayout;
  const titleBlock = (
    <>
      <p className="demo-kicker">{content.hero.kicker}</p>
      <h1>{content.hero.title}</h1>
      <p className="demo-subtitle">{content.hero.subtitle}</p>
      <HeroCtas content={content} />
    </>
  );
  const image = heroImage ? (
    <img className="demo-hero-img" src={heroImage.url} alt={heroImage.caption} />
  ) : null;

  if (layout === 'split') {
    return (
      <section className="demo-hero hero-split" aria-label="Presentación">
        <div className="hero-split-text">{titleBlock}</div>
        <div className="hero-split-media">{image}</div>
      </section>
    );
  }
  if (layout === 'card') {
    return (
      <section className="demo-hero hero-card" aria-label="Presentación">
        <div className="hero-card-media">{image}</div>
        <div className="hero-card-body">{titleBlock}</div>
      </section>
    );
  }
  // banner (default): full-bleed image, title block on the dark band below.
  return (
    <section className="demo-hero hero-banner" aria-label="Presentación">
      <div className="hero-banner-media">{image}</div>
      <div className="hero-banner-body">{titleBlock}</div>
    </section>
  );
}

function DemoSite({ demo }: { demo: GeneratedDemo }) {
  const content = demo.content;
  const template = getTemplate(content.templateId);
  const palette = content.brand.palette;
  const vars = {
    '--bg': palette.background,
    '--surface': palette.surface,
    '--primary': palette.primary,
    '--primary-dark': palette.primaryDark,
    '--accent': palette.accent,
    '--text': palette.text,
    '--muted': palette.muted,
    '--font-heading': content.brand.fontHeading,
    '--font-body': content.brand.fontBody,
  } as CSSProperties;

  useEffect(() => {
    setSeo(content.seo.title, content.seo.description);
  }, [content]);

  const sections = template?.sections ?? ['hero', 'trust', 'services', 'about', 'gallery', 'faq', 'contact'];
  const reviews = content.verified.reviews;
  const foundedYear = content.verified.foundedYear;

  return (
    <div className="demo-site" style={vars}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="notice">{content.notice}</div>
      <header className="demo-header">
        <img className="demo-logo" src={content.brand.logoSvgDataUri} alt={`Logotipo conceptual de ${content.businessName}`} />
        <span className="demo-header-name">{content.businessName}</span>
        <span className="demo-header-sector">{content.sector}</span>
      </header>

      <main id="contenido">
        {sections.map((section) => {
          switch (section) {
            case 'hero':
              return <Hero key="hero" content={content} />;
            case 'trust':
              return (
                <section key="trust" className="demo-trust" aria-label="Datos verificados">
                  <h2>Datos verificados</h2>
                  <p className="section-intro">
                    Todo lo que ves en esta página procede del expediente verificado de la empresa.
                    Lo que no está verificado no se publica.
                  </p>
                  <ul className="trust-grid">
                    {content.trust.items.map((item) => (
                      <li key={item} className="trust-card">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {reviews || foundedYear ? (
                    <div className="trust-stats" aria-label="Distintivos verificados">
                      {reviews ? (
                        <div className="trust-stat trust-reviews">
                          <span className="review-rating">{reviews.rating} / 5</span>
                          <span className="review-count">
                            {reviews.count} {reviews.count === 1 ? 'reseña' : 'reseñas'} verificadas
                          </span>
                        </div>
                      ) : null}
                      {foundedYear ? (
                        <div className="trust-stat trust-founded">
                          <span className="founded-year">{foundedYear}</span>
                          <span className="founded-label">Año de constitución (verificado)</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            case 'services':
              return (
                <section key="services" className="demo-services" aria-label="Servicios">
                  <h2>Servicios</h2>
                  {content.services.pendingConfirmation ? (
                    <p className="pending-note">{content.services.note}</p>
                  ) : (
                    <ul className="services-list">
                      {content.services.items.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            case 'howItWorks':
              return content.howItWorks ? (
                <section key="howItWorks" className="demo-how" aria-label="Cómo trabajamos">
                  <h2>Cómo trabajamos</h2>
                  <ol className="steps-list">
                    {content.howItWorks.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </section>
              ) : null;
            case 'about':
              return (
                <section key="about" className="demo-about" aria-label="La empresa">
                  <h2>{content.about.heading}</h2>
                  {content.about.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </section>
              );
            case 'gallery':
              return (
                <section key="gallery" className="demo-gallery" aria-label="Galería">
                  <h2>Galería</h2>
                  <p className="section-intro">
                    Imágenes de archivo que muestran el oficio, no el local de la empresa.
                  </p>
                  <div className="gallery-grid">
                    {content.gallery.images.map((img) => (
                      <figure key={img.url}>
                        <img src={img.url} alt={img.caption} />
                        <figcaption>{img.caption}</figcaption>
                      </figure>
                    ))}
                  </div>
                  <p className="muted">{content.legal.imageCredits}</p>
                </section>
              );
            case 'faq':
              return (
                <section key="faq" className="demo-faq" aria-label="Preguntas frecuentes">
                  <h2>Preguntas frecuentes</h2>
                  {content.faq.map((f) => (
                    <details key={f.question}>
                      <summary>{f.question}</summary>
                      <p>{f.answer}</p>
                    </details>
                  ))}
                </section>
              );
            case 'contact':
              return (
                <section key="contact" className="demo-contact" aria-label="Contacto">
                  <h2>Contacto</h2>
                  <p className="section-intro">
                    Contacto directo con la empresa, sin intermediarios.
                  </p>
                  <ContactCard content={content} />
                </section>
              );
            default:
              return null;
          }
        })}
      </main>

      <footer className="demo-footer">
        <p>{content.legal.demoNote}</p>
      </footer>
    </div>
  );
}

/**
 * Página de entrada de la plataforma (orden de Jon 2026-11-17): el
 * listado completo de proyectos en activo, con la información de cada
 * proyecto y el enlace a su página. SOLO lo ve quien tiene la clave
 * (Jon): la puerta de clave envuelve esta página. Sin la clave no se
 * ve nada del listado.
 */
function Dashboard() {
  useEffect(() => {
    setSeo('WebLead AI — Plataforma de demos', 'Demos conceptuales generadas por WebLead AI para empresas de Logroño sin web propia.');
  }, []);
  return (
    <main className="dashboard">
      <div className="notice">{DEMO_NOTICE}</div>
      <h1>WebLead AI — Plataforma de demos</h1>
      <p>
        Demos generadas por el Designer de WebLead AI a partir del expediente verificado de cada
        empresa. Ninguna es la web oficial de la empresa: son propuestas conceptuales pendientes de
        autorización.
      </p>
      <div className="demo-table-wrap">
        <table className="demo-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Sector</th>
              <th>Plantilla</th>
              <th>Variante</th>
              <th>Estado</th>
              <th>Auditoría</th>
              <th>Demo</th>
            </tr>
          </thead>
          <tbody>
            {GENERATED_DEMOS.map((demo) => (
              <tr key={demo.content.businessSlug}>
                <td>{demo.content.businessName}</td>
                <td>{demo.content.sector}</td>
                <td>{demo.content.templateId}</td>
                <td>{demo.content.brand.variantId}</td>
                <td>{demo.businessState}</td>
                <td>{demo.auditStatus ?? 'pendiente'}</td>
                <td>
                  <a href={demo.demoUrl}>Ver demo</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="demo-cards">
        {GENERATED_DEMOS.map((demo) => (
          <li key={demo.content.businessSlug} className="demo-card">
            <h2>{demo.content.businessName}</h2>
            <p className="demo-card-meta">
              {demo.content.sector} · {demo.content.templateId} · {demo.content.brand.variantId}
            </p>
            <p className="demo-card-status">
              {demo.businessState} · Auditoría: {demo.auditStatus ?? 'pendiente'}
            </p>
            <a className="demo-card-link" href={demo.demoUrl}>
              Ver demo →
            </a>
          </li>
        ))}
      </ul>
      {GENERATED_DEMOS.length === 0 ? (
        <p>No hay demos generadas todavía. Genera una con POST /api/websites/generate.</p>
      ) : null}
    </main>
  );
}

function AppContent() {
  const [slug, setSlug] = useState<string | null>(() => slugFromPath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setSlug(slugFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Sin slug: la página de entrada (índice) es PRIVADA y solo la ve
  // quien tiene la clave (Jon). Las demos individuales son públicas:
  // cualquiera con el enlace las ve sin clave.
  if (!slug) {
    return (
      <PasswordGate>
        <Dashboard />
      </PasswordGate>
    );
  }

  const demo = GENERATED_DEMOS.find((d) => d.content.businessSlug === slug);
  if (!demo) {
    return (
      <main className="dashboard">
        <div className="notice">{DEMO_NOTICE}</div>
        <h1>Demo no encontrada: {slug}</h1>
        <p>
          Solo existen las demos generadas en la Fase D. <a href="/">Volver a la plataforma</a>
        </p>
      </main>
    );
  }
  return <DemoSite demo={demo} />;
}

/**
 * La página de entrada (índice de proyectos) es privada: solo la ve
 * quien tiene la clave (Jon). Las demos individuales (/demos/{slug})
 * son públicas y no pasan por esta puerta.
 */
export default function App() {
  return <AppContent />;
}
