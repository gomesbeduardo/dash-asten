-- Revisão do banco (15/10): índice redundante, Mes Ref. para auditoria (D63) e CHECKs de formato.

-- DropIndex: o índice único (tipo, competencia, versao) já atende as listagens nos dois sentidos.
DROP INDEX IF EXISTS "cargas_tipo_competencia_versao_idx";

-- AlterTable
ALTER TABLE "cargas" ADD COLUMN "mes_ref" CHAR(7);

-- CHECKs (o Prisma não modela CHECK; a API já valida, isto protege escritas fora dela)
ALTER TABLE "cargas" ADD CONSTRAINT "cargas_competencia_formato" CHECK ("competencia" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE "cargas" ADD CONSTRAINT "cargas_mes_ref_formato" CHECK ("mes_ref" IS NULL OR "mes_ref" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE "cargas" ADD CONSTRAINT "cargas_versao_positiva" CHECK ("versao" > 0);
ALTER TABLE "cargas" ADD CONSTRAINT "cargas_linhas_nao_negativas" CHECK ("linhas" >= 0);
