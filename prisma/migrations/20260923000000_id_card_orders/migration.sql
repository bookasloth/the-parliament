-- CreateEnum
CREATE TYPE "IdCardOrderStatus" AS ENUM ('created', 'attempted', 'paid', 'printing', 'shipped', 'delivered', 'failed', 'cancelled', 'refunded');

-- CreateTable
CREATE TABLE "id_card_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "card_price_paise" INTEGER NOT NULL,
    "delivery_paise" INTEGER NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "IdCardOrderStatus" NOT NULL DEFAULT 'created',
    "recipient_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address_line" VARCHAR(300) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "state" VARCHAR(80) NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "razorpay_order_id" VARCHAR(64),
    "razorpay_payment_id" VARCHAR(64),
    "razorpay_signature" TEXT,
    "captured_at" TIMESTAMPTZ,
    "tracking_id" VARCHAR(120),
    "shipped_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "id_card_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "id_card_orders_razorpay_order_id_key" ON "id_card_orders"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "id_card_orders_user_id_created_at_idx" ON "id_card_orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "id_card_orders_status_idx" ON "id_card_orders"("status");

-- AddForeignKey
ALTER TABLE "id_card_orders" ADD CONSTRAINT "id_card_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
