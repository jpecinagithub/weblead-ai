import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { DEMO_NOTICE } from '@weblead/agent-designer';
import { getTemplate } from '@weblead/website-templates';
import type { GeneratedWebsiteContent } from '@weblead/website-generator';
import { GENERATED_DEMOS, type GeneratedDemo } from './data/generated-demos.js';

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

/** Demo-only contact form: local validation, NO submit to any third party. */
function DemoContactForm({ content }: { content: GeneratedWebsiteContent }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Escribe tu nombre (mínimo 2 caracteres).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Escribe un email válido.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Escribe un mensaje de al menos 10 caracteres.');
      return;
    }
    setError(null);
    setSent(true);
  }

  if (sent) {
    return (
      <p className="form-sent" role="status">
        Demo: tu mensaje se ha validado, pero no se ha enviado a ningún tercero. Nadie recibe este
        mensaje. Para contactar de verdad con la empresa, usa el teléfono de esta página.
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate aria-label="Formulario de contacto (demostración)">
      <label>
        Nombre
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>
        Mensaje
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Enviar (demo)</button>
      <p className="muted">{content.contact.formNote}</p>
    </form>
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

  const heroImage = content.gallery.images.find((i) => i.placement === 'hero');
  const sections = template?.sections ?? ['hero', 'trust', 'services', 'about', 'gallery', 'faq', 'contact'];

  return (
    <div className="demo-site" style={vars}>
      <div className="notice">{content.notice}</div>
      <header className="demo-header">
        <img className="demo-logo" src={content.brand.logoSvgDataUri} alt={`Logotipo conceptual de ${content.businessName}`} />
        <span className="demo-kicker">{content.hero.kicker}</span>
      </header>

      {sections.map((section) => {
        switch (section) {
          case 'hero':
            return (
              <section key="hero" className="demo-hero" aria-label="Presentación">
                {heroImage ? (
                  <img className="demo-hero-img" src={heroImage.url} alt={heroImage.caption} />
                ) : null}
                <h1>{content.hero.title}</h1>
                <p className="demo-subtitle">{content.hero.subtitle}</p>
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
                </div>
              </section>
            );
          case 'trust':
            return (
              <section key="trust" className="demo-trust" aria-label="Datos verificados">
                <h2>Datos verificados</h2>
                <ul>
                  {content.trust.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            );
          case 'services':
            return (
              <section key="services" className="demo-services" aria-label="Servicios">
                <h2>Servicios</h2>
                {content.services.pendingConfirmation ? (
                  <p className="pending-note">{content.services.note}</p>
                ) : (
                  <ul>
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
                <ol>
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
                <div className="gallery-grid">
                  {content.gallery.images.map((img) => (
                    <figure key={img.url}>
                      <img src={img.url} alt={img.caption} loading="lazy" />
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
                <address>
                  {content.contact.address ? <p>{content.contact.address}</p> : null}
                  {content.contact.phoneHref ? (
                    <p>
                      Teléfono: <a href={content.contact.phoneHref}>{content.contact.phone}</a>
                    </p>
                  ) : null}
                  {content.contact.email ? (
                    <p>
                      Email: <a href={`mailto:${content.contact.email}`}>{content.contact.email}</a>
                    </p>
                  ) : null}
                </address>
                <DemoContactForm content={content} />
              </section>
            );
          default:
            return null;
        }
      })}

      <footer className="demo-footer">
        <p>{content.legal.demoNote}</p>
        <p>
          <a href="/">← Volver a la plataforma de demos</a>
        </p>
      </footer>
    </div>
  );
}

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
      <table className="demo-table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Sector</th>
            <th>Plantilla</th>
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
              <td>{demo.businessState}</td>
              <td>{demo.auditStatus ?? 'pendiente'}</td>
              <td>
                <a href={demo.demoUrl}>Ver demo</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {GENERATED_DEMOS.length === 0 ? (
        <p>No hay demos generadas todavía. Genera una con POST /api/websites/generate.</p>
      ) : null}
    </main>
  );
}

export default function App() {
  const [slug, setSlug] = useState<string | null>(() => slugFromPath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setSlug(slugFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (!slug) return <Dashboard />;

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
