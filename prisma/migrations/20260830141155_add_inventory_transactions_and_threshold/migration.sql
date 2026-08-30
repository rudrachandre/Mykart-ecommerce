-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "previousReserved" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "newReserved" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryTransaction_inventoryId_idx" ON "InventoryTransaction"("inventoryId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Inventory_variantId_idx" ON "Inventory"("variantId");

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
