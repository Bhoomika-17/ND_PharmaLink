-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cartItems" JSONB NOT NULL DEFAULT '[]';
