-- AlterTable
ALTER TABLE "cargas" DROP CONSTRAINT "cargas_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "cargas_pkey" PRIMARY KEY ("id");

