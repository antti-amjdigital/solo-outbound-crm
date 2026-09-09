-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Note_prospectId_pinned_idx" ON "Note"("prospectId", "pinned");
