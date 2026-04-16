-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketingConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "adAccountId" TEXT,
    "adAccountName" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "errorMsg" TEXT,
    CONSTRAINT "TrackingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "MarketingConnection_tenantId_idx" ON "MarketingConnection"("tenantId");

-- CreateIndex
CREATE INDEX "MarketingConnection_platform_idx" ON "MarketingConnection"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingConnection_userId_platform_adAccountId_key" ON "MarketingConnection"("userId", "platform", "adAccountId");

-- CreateIndex
CREATE INDEX "TrackingEvent_tenantId_eventName_idx" ON "TrackingEvent"("tenantId", "eventName");

-- CreateIndex
CREATE INDEX "TrackingEvent_sentAt_idx" ON "TrackingEvent"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingEvent_eventId_platform_key" ON "TrackingEvent"("eventId", "platform");
