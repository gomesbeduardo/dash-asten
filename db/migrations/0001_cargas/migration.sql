-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "cargas" (
    "id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "competencia" CHAR(7) NOT NULL,
    "versao" INTEGER NOT NULL,
    "importada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivo" TEXT NOT NULL,
    "linhas" INTEGER NOT NULL,
    "dados" JSONB NOT NULL,
    "original" BYTEA,

    CONSTRAINT "cargas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cargas_tipo_competencia_versao_idx" ON "cargas"("tipo", "competencia" DESC, "versao" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cargas_tipo_competencia_versao_key" ON "cargas"("tipo", "competencia", "versao");

