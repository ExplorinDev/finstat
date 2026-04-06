-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ico" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "district" TEXT,
    "legalForm" TEXT,
    "dateCreated" DATETIME,
    "dateDeleted" DATETIME,
    "status" TEXT,
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StatutoryMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyIco" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "titleBefore" TEXT,
    "titleAfter" TEXT,
    "role" TEXT,
    "dateFrom" DATETIME,
    "dateTo" DATETIME,
    CONSTRAINT "StatutoryMember_companyIco_fkey" FOREIGN KEY ("companyIco") REFERENCES "Company" ("ico") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shareholder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyIco" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "shareholderIco" TEXT,
    "shareText" TEXT,
    "dateFrom" DATETIME,
    "dateTo" DATETIME,
    CONSTRAINT "Shareholder_companyIco_fkey" FOREIGN KEY ("companyIco") REFERENCES "Company" ("ico") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_ico_key" ON "Company"("ico");

-- CreateIndex
CREATE INDEX "StatutoryMember_companyIco_idx" ON "StatutoryMember"("companyIco");

-- CreateIndex
CREATE INDEX "Shareholder_companyIco_idx" ON "Shareholder"("companyIco");
