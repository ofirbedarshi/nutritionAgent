-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'he',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeMedia" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Preferences" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "goal" TEXT NOT NULL DEFAULT 'general',
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "reportTime" TEXT NOT NULL DEFAULT '21:30',
    "reportFormat" TEXT NOT NULL DEFAULT 'text',
    "focus" TEXT NOT NULL DEFAULT '[]',
    "thresholds" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" TEXT NOT NULL DEFAULT 'TEXT',
    "rawText" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    CONSTRAINT "MessageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
