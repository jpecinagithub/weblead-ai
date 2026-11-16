// Regenerates packages/shared/src/data/pilot-leads.json from
// docs/feasibility-data.csv (the 10 leads with score >= 70).
// Run: node scripts/generate-pilot-seed.mjs
// No invented data: the JSON is a mechanical projection of the CSV.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const csv = readFileSync(join(root, 'docs/feasibility-data.csv'), 'utf-8');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const [header, ...data] = parseCsv(csv);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
const leads = data
  .filter((r) => r[idx.supera_70] === 'sí')
  .map((r) => ({
    id: Number(r[idx.id]),
    name: r[idx.nombre],
    sector: r[idx.sector],
    address: r[idx.direccion] || null,
    phone: r[idx.telefono] || null,
    email: r[idx.email] || null,
    hasOwnWebsite: false,
    websiteUrl: r[idx.web_url] || null,
    alternativePresence: r[idx.presencia_alternativa] || null,
    activity: r[idx.actividad],
    activitySignal: r[idx.senal_actividad],
    signalDate: r[idx.fecha_senal] || null,
    signalSource: r[idx.fuente_senal],
    score: {
      noWebsite: Number(r[idx.score_sin_web]),
      activity: Number(r[idx.score_actividad]),
      digitalNeed: Number(r[idx.score_necesidad]),
      contactability: Number(r[idx.score_contacto]),
      economicPotential: Number(r[idx.score_potencial]),
      total: Number(r[idx.score_total]),
    },
    state: 'DISCOVERED',
    consultedAt: r[idx.fecha_consulta],
  }));

writeFileSync(
  join(root, 'packages/shared/src/data/pilot-leads.json'),
  JSON.stringify(leads, null, 2) + '\n',
  'utf-8',
);
console.log(`Wrote ${leads.length} pilot leads (score >= 70) from feasibility-data.csv`);
