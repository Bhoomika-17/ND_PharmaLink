-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "cartItems" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT NOT NULL DEFAULT 'Not Provided';

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
