-- CreateTable
CREATE TABLE "menu_permissions" (
    "id" TEXT NOT NULL,
    "menuKey" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_permissions_menuKey_role_key" ON "menu_permissions"("menuKey", "role");
