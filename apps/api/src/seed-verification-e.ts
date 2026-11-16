/**
 * Fixtures de verificación Fase E (NO son empresas reales).
 *
 * Crea dos empresas sintéticas APPROVED con demo, para verificar en vivo
 * el flujo comercial sin tocar a ninguna empresa real:
 * - A: "VERIFICACIÓN FASE E — Empresa de prueba (ficticia, no contactar)",
 *   con permiso EXISTING_RELATIONSHIP simulado (fuente: "fixture de prueba
 *   Fase E — relación simulada para verificar el flujo, NO es un
 *   consentimiento real") y correo @example.invalid (dominio no entregable).
 *   Sirve para el flujo APPROVED -> SALES_PENDING -> SALES_APPROVED.
 * - B: "VERIFICACIÓN FASE E — Baja de prueba (ficticia, no contactar)",
 *   igual que A, para verificar en vivo que una supresión bloquea el
 *   prepare (SUPPRESSED).
 *
 * Las empresas reales del piloto (Ferrer, Begoña Ruiz) NO reciben ningún
 * permiso inventado: su prepare debe bloquear por gate legal.
 *
 * Idempotente: borra y recrea las dos fixtures por slug.
 * Uso: pnpm --filter @weblead/api seed:verification-e
 */
import dotenv from 'dotenv';
import { prisma } from '@weblead/database';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

const FIXTURES = [
  {
    slug: 'verificacion-fase-e-empresa-de-prueba',
    name: 'VERIFICACIÓN FASE E — Empresa de prueba (ficticia, no contactar)',
    email: 'verificacion-fase-e@example.invalid',
  },
  {
    slug: 'verificacion-fase-e-baja-de-prueba',
    name: 'VERIFICACIÓN FASE E — Baja de prueba (ficticia, no contactar)',
    email: 'baja-prueba-fase-e@example.invalid',
  },
] as const;

async function main(): Promise<void> {
  for (const f of FIXTURES) {
    const old = await prisma.business.findUnique({ where: { slug: f.slug } });
    if (old) {
      await prisma.business.delete({ where: { id: old.id } });
      console.log(`  borrada fixture previa ${f.slug}`);
    }
    const business = await prisma.business.create({
      data: {
        name: f.name,
        slug: f.slug,
        sector: 'fontanería/climatización',
        municipality: 'Logroño',
        province: 'La Rioja',
        phone: '941000000',
        email: f.email,
        hasOwnWebsite: false,
        activity: 'CONFIRMED',
        state: 'APPROVED',
      },
    });
    await prisma.websiteProject.create({
      data: {
        businessId: business.id,
        slug: f.slug,
        status: 'APPROVED',
        templateId: 'fontaneria-climatizacion',
        content: { businessName: f.name, demo: true, fixture: true },
      },
    });
    await prisma.contactPermission.create({
      data: {
        businessId: business.id,
        basis: 'EXISTING_RELATIONSHIP',
        source: 'fixture de prueba Fase E — relación simulada para verificar el flujo, NO es un consentimiento real',
        notes: 'Permiso sintético de verificación. No usar para contacto real.',
      },
    });
    console.log(`  fixture ${f.slug}: business=${business.id.slice(0, 8)} APPROVED + demo + permiso simulado`);
  }
  console.log('Fixtures Fase E listas.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
