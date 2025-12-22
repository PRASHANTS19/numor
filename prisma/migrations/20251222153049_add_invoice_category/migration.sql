/*
  Warnings:

  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'EXTERNAL', 'ADMIN');

-- AlterTable
ALTER TABLE "invoice_bills" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
