/*
  Warnings:

  - A unique constraint covering the columns `[bookingCode]` on the table `ca_bookings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookingCode` to the `ca_bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ca_bookings" ADD COLUMN     "bookingCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ca_bookings_bookingCode_key" ON "ca_bookings"("bookingCode");
