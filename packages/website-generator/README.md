# @weblead/website-generator

Deterministic website generator (Fase D). Builds the site content from the
Researcher dossier ONLY.

- Services: only the dossier's contrasted list. Pilot dossiers list none,
  so demos render an explicit "pending confirmation" note — never a
  sector-generic service list presented as the business's own.
- `validateNoInventedClaims` rejects prices, hours, testimonials,
  superlatives, certifications, years of experience and 24h urgencies in
  any copy, including LLM drafts (rejected fields fall back to deterministic
  text and the rejection is recorded).
- WhatsApp link only for a verified public Spanish phone. The contact form
  is demo-only (no submit anywhere). Images are Unsplash License stock
  photos served locally, each with source URL + licence; the logo is a
  conceptual own SVG (initials + sector motif).
