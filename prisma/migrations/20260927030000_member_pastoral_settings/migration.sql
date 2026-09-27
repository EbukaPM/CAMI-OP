-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "attendanceNotes" TEXT,
ADD COLUMN     "photoFileAssetId" TEXT;

-- AlterTable
ALTER TABLE "PastorProfile" ADD COLUMN     "currentRank" TEXT,
ADD COLUMN     "salary" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "ChurchSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "churchName" TEXT NOT NULL DEFAULT 'CAMI Church',
    "primaryColor" TEXT NOT NULL DEFAULT '#0f172a',
    "logoFileAssetId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModulePermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "module" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,

    CONSTRAINT "ModulePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserModuleGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChurchSettings_logoFileAssetId_key" ON "ChurchSettings"("logoFileAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "ModulePermission_role_module_key" ON "ModulePermission"("role", "module");

-- CreateIndex
CREATE UNIQUE INDEX "UserModuleGrant_userId_module_key" ON "UserModuleGrant"("userId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "Member_photoFileAssetId_key" ON "Member"("photoFileAssetId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_photoFileAssetId_fkey" FOREIGN KEY ("photoFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchSettings" ADD CONSTRAINT "ChurchSettings_logoFileAssetId_fkey" FOREIGN KEY ("logoFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleGrant" ADD CONSTRAINT "UserModuleGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleGrant" ADD CONSTRAINT "UserModuleGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

