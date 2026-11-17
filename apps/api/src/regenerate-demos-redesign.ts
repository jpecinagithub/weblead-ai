/**
 * Regenerate the 10 demo-platform demos with the 2026-11-17 redesign.
 *
 * Why a script instead of the API pipeline: the businesses are APPROVED,
 * and the state machine only allows DESIGNING from QUALIFIED / AUDIT_FAILED
 * / PREVIEW_READY — re-designing through designWebsite() would throw.
 * This script rebuilds the *content* deterministically from the same
 * verified sources the original generation used, without changing any
 * business state:
 *
 * - Dossier facts: packages/shared/src/data/pilot-leads.json (Fase A CSV:
 *   name, sector, address, phone, email, activity, activitySignal,
 *   signalSource, consultedAt, score.total, hasOwnWebsite).
 * - LLM drafts: the already-accepted subtitle/about of the previous
 *   generated content (acceptedSubtitle/acceptedAbout); they are re-fed
 *   through the same validation and rejected again if they now fail.
 * - Slug: kept from the previous content, so /demos/{slug} URLs are stable.
 *
 * Guards (fail loudly, write nothing):
 * - every rebuilt fact (name/address/phone/email) must equal the previous
 *   content exactly;
 * - no generated copy may trip validateNoInventedClaims;
 * - the serialized content must contain no "formNote" and no "formulario".
 *
 * auditStatus is reset to null: the re-audit (Playwright) runs after this
 * script and fills it in. businessState and demoUrl are preserved.
 *
 * Usage: pnpm --filter @weblead/api regenerate:demos
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildWebsiteContent,
  validateNoInventedClaims,
  type GeneratedWebsiteContent,
  type GeneratorBusinessInput,
  type LlmDraft,
} from '@weblead/website-generator';

/** Previous demos file, read as text (not imported: it lives outside the API rootDir). */
type PreviousDemo = {
  content: GeneratedWebsiteContent;
  businessState: string;
  auditStatus: string | null;
  demoUrl: string;
};

function readPreviousDemos(): PreviousDemo[] {
  const raw = readFileSync(
    join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'),
    'utf8',
  );
  const marker = 'export const GENERATED_DEMOS: GeneratedDemo[] = ';
  const at = raw.indexOf(marker);
  if (at < 0) throw new Error('GENERATED_DEMOS export not found in the previous demos file.');
  const jsonText = raw.slice(at + marker.length).replace(/;\s*$/, '');
  return JSON.parse(jsonText) as PreviousDemo[];
}

const GENERATED_DEMOS = readPreviousDemos();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

type PilotLead = {
  id: number;
  name: string;
  sector: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  hasOwnWebsite: boolean;
  activity: string;
  activitySignal: string | null;
  signalSource: string;
  consultedAt: string;
  score: { total: number };
};

const leads: PilotLead[] = JSON.parse(
  readFileSync(join(ROOT, 'packages/shared/src/data/pilot-leads.json'), 'utf8'),
);

const out: {
  content: ReturnType<typeof buildWebsiteContent>;
  businessState: string;
  auditStatus: string | null;
  demoUrl: string;
}[] = [];

for (const demo of GENERATED_DEMOS) {
  const old = demo.content;
  const lead = leads.find((l) => l.name === old.businessName);
  if (!lead) throw new Error(`Pilot lead not found for "${old.businessName}" — refusing to invent input.`);
  if (lead.address !== old.contact.address) throw new Error(`Address mismatch for ${lead.name}.`);
  if (lead.phone !== old.contact.phone) throw new Error(`Phone mismatch for ${lead.name}.`);
  if ((lead.email ?? null) !== (old.contact.email ?? null)) throw new Error(`Email mismatch for ${lead.name}.`);

  const input: GeneratorBusinessInput = {
    name: lead.name,
    sector: lead.sector,
    address: lead.address,
    phone: lead.phone,
    email: lead.email,
    municipality: 'Logroño',
    province: 'La Rioja',
    activity: lead.activity,
    activitySignal: lead.activitySignal,
    hasOwnWebsite: lead.hasOwnWebsite,
    scoreTotal: lead.score.total,
    services: [...old.services.items],
    slug: old.businessSlug,
    pilotId: lead.id,
    consultedAt: lead.consultedAt,
    sources: lead.signalSource.split(' + ').map((s) => s.trim()),
  };
  const draft: LlmDraft = {};
  if (old.llm.acceptedSubtitle) draft.subtitle = old.hero.subtitle;
  if (old.llm.acceptedAbout) {
    if (old.about.paragraphs.length < 2) throw new Error(`acceptedAbout but no 2nd paragraph for ${lead.name}.`);
    draft.about = old.about.paragraphs[1]!;
  }

  const content = buildWebsiteContent(input, undefined, Object.keys(draft).length > 0 ? draft : null);

  // ---- Guards: facts identical, nothing invented, no form anywhere. ----
  if (content.businessName !== old.businessName) throw new Error(`Name changed for ${lead.name}.`);
  if (content.contact.address !== old.contact.address) throw new Error(`Address changed for ${lead.name}.`);
  if (content.contact.phone !== old.contact.phone) throw new Error(`Phone changed for ${lead.name}.`);
  if ((content.contact.email ?? null) !== (old.contact.email ?? null)) throw new Error(`Email changed for ${lead.name}.`);
  // Same scope as the auditor (auditWebsiteContent): hero subtitle and about
  // paragraphs. (La sección 'trust' se eliminó en la 4ª tanda
  // 2026-11-17: ya no hay trust items que validar.) Template FAQ is static vetted copy where
  // "horarios" only appears negated ("no publica horarios"); it is covered
  // by the templates test with narrower patterns, not by this guard.
  const copyFields = [
    content.hero.subtitle,
    ...content.about.paragraphs,
  ];
  for (const text of copyFields) {
    const violations = validateNoInventedClaims(text);
    if (violations.length > 0) throw new Error(`Forbidden claim in ${lead.name}: ${violations.join(', ')} — "${text.slice(0, 100)}"`);
  }
  const serialized = JSON.stringify(content);
  if (/formNote|formulario|<form|<input|<textarea/i.test(serialized)) {
    throw new Error(`Form text survived in regenerated content for ${lead.name}.`);
  }
  if (content.llm.used !== old.llm.used) {
    console.warn(`  (aviso) ${lead.name}: llm.used cambió ${old.llm.used} -> ${content.llm.used}`);
  }

  out.push({
    content,
    businessState: demo.businessState,
    auditStatus: null, // pending re-audit (Playwright) after the redesign
    demoUrl: demo.demoUrl,
  });
  console.log(
    `- ${lead.name}: variant=${content.brand.variantId} layout=${content.brand.heroLayout} ` +
      `reviews=${content.verified.reviews ? `${content.verified.reviews.count}x ${content.verified.reviews.rating}/5` : '—'} ` +
      `founded=${content.verified.foundedYear ?? '—'} llm=${content.llm.used ? 'aceptado' : 'no'}`,
  );
}

const header =
  `/**\n` +
  ` * Generated demos — REGENERATED 2026-11-17 by apps/api/src/regenerate-demos-redesign.ts\n` +
  ` * (rediseño sin formularios + variantes por negocio; fuentes: pilot-leads.json\n` +
  ` * + borradores LLM ya aceptados; URLs /demos/{slug} estables).\n` +
  ` * Do not edit by hand: re-run the script (it re-validates every fact).\n` +
  ` * Generated at ${new Date().toISOString()} (${out.length} demos).\n` +
  ` */\n` +
  `import type { GeneratedWebsiteContent } from '@weblead/website-generator';\n\n` +
  `export type GeneratedDemo = {\n  content: GeneratedWebsiteContent;\n  businessState: string;\n  auditStatus: string | null;\n  demoUrl: string;\n};\n\n` +
  `export const GENERATED_DEMOS: GeneratedDemo[] = ${JSON.stringify(out, null, 2)};\n`;

writeFileSync(join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'), header);
console.log(`Wrote ${out.length} regenerated demos (auditStatus reset to null, pending re-audit).`);
