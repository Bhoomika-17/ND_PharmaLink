-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "company" TEXT NOT NULL DEFAULT 'Unknown',
ALTER COLUMN "stock" DROP DEFAULT;
