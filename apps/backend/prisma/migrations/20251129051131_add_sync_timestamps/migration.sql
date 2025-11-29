-- AlterTable
ALTER TABLE "repos" ADD COLUMN     "lastSyncAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastSyncAt" TIMESTAMP(3);
