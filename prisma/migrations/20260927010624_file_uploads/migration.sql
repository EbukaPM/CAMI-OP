-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "fileAssetId" TEXT,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "fileAssetId" TEXT,
ALTER COLUMN "fileUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_fileAssetId_key" ON "Attachment"("fileAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_fileAssetId_key" ON "Document"("fileAssetId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

