-- Fase D: el Designer persiste el contenido generado en WebsiteProject y el
-- Auditor registra el runner usado y las capturas en Audit.
ALTER TABLE "WebsiteProject" ADD COLUMN "content" JSONB;
ALTER TABLE "Audit" ADD COLUMN "runner" TEXT;
ALTER TABLE "Audit" ADD COLUMN "demoUrl" TEXT;
ALTER TABLE "Audit" ADD COLUMN "screenshots" JSONB;
