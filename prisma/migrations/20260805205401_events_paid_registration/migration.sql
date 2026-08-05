-- Paid events: price on the event + a registration order table.

ALTER TABLE "events" ADD COLUMN "price_paise" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "event_orders" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(20) NOT NULL DEFAULT 'created',
    "razorpay_order_id" VARCHAR(64),
    "razorpay_payment_id" VARCHAR(64),
    "razorpay_signature" TEXT,
    "captured_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_orders_razorpay_order_id_key" ON "event_orders"("razorpay_order_id");
CREATE INDEX "event_orders_event_id_status_idx" ON "event_orders"("event_id", "status");
CREATE INDEX "event_orders_user_id_created_at_idx" ON "event_orders"("user_id", "created_at");

ALTER TABLE "event_orders" ADD CONSTRAINT "event_orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_orders" ADD CONSTRAINT "event_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
