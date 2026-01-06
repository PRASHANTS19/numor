/*
  Warnings:

  - You are about to drop the column `pdfUrl` on the `invoice_bills` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoice_bills" DROP COLUMN "pdfUrl",
ADD COLUMN     "pdfKey" TEXT;
