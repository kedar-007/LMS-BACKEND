const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Stripe = require("stripe");
const catalyst = require("zcatalyst-sdk-node");

dotenv.config();

const app = express();

console.log("Sucess URL--", process.env.CLIENT_URL);
/**
 * ⚠️ Stripe webhook MUST receive raw body
 */
app.use("/stripe-webhook", express.raw({ type: "application/json" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Stripe-Signature"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/check", (req, res) => {
  console.log("✅ Health check hit");
  return res.status(200).json({ message: "payment service live" });
});

/**
 * =========================
 * CREATE CHECKOUT SESSION
 * =========================
 */
app.post("/create-checkout-session", async (req, res) => {
  console.log("🚀 /create-checkout-session called");
  console.log("📦 Request Body:", req.body);

  const { product, user_id, org_id } = req.body;

  if (!product || !user_id || !org_id) {
    return res.status(400).json({
      success: false,
      message: "product, user_id and org_id are required",
    });
  }

  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    console.log("🔍 Fetching Stripe config via ZCQL for org:", org_id);

    // Fetch Stripe config
    const stripeConfigQuery = `
      SELECT stripe_configurations.ROWID,
             stripe_configurations.stripe_secret_key,
             stripe_configurations.currency
      FROM stripe_configurations
      WHERE stripe_configurations.org_id = ${Number(org_id)}
        AND stripe_configurations.is_active = true
    `;

    const stripeConfigResult = await zcql.executeZCQLQuery(stripeConfigQuery);
    if (!stripeConfigResult || stripeConfigResult.length === 0) {
      throw new Error("Stripe configuration not found for this organization");
    }

    const stripeConfig = stripeConfigResult[0].stripe_configurations;
    const stripe = new Stripe(stripeConfig.stripe_secret_key);

    console.log("💳 Creating Stripe checkout session");

    // Create Checkout Session with correct metadata
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: stripeConfig.currency || "usd",
            product_data: {
              name: product.name,
              images: [
                product.image ||
                  "https://dummyimage.com/300x200/000/fff&text=Locker",
              ],
            },
            unit_amount: product.price * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        org_id: String(org_id), // ✅ convert to string to avoid issues
        user_id: String(user_id),
      },
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    console.log("✅ Stripe session created:", session.id);

    // Insert PENDING payment
    const paymentsTable = catalystApp.datastore().table("payments");
    const paymentRow = await paymentsTable.insertRow({
      org_id,
      amount: product.price,
      currency: stripeConfig.currency || "usd",
      provider: "stripe",
      provider_payment_id: session.id,
      status: "PENDING",
    });

    console.log("📝 Payment inserted:", paymentRow.ROWID);

    return res.status(200).json({
      success: true,
      checkout_url: session.url,
      payment_id: paymentRow.ROWID,
    });
  } catch (error) {
    console.error("🔥 Checkout session error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * =========================
 * STRIPE WEBHOOK
 * =========================
 */
app.post("/stripe-webhook", async (req, res) => {
  console.log("📥 Stripe webhook received");

  let event;
  let org_id;

  try {
    const payload = req.body;
    const sig = req.headers["stripe-signature"];

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    // Try extracting org_id from metadata
    let tempPayload;
    try {
      tempPayload = JSON.parse(req.body.toString());
      org_id = tempPayload?.data?.object?.metadata?.org_id;
      console.log("ORG ID from metadata:", org_id);
    } catch {}

    let stripeConfig;
    if (org_id) {
      const webhookQuery = `
		  SELECT stripe_configurations.ROWID,
				 stripe_configurations.stripe_secret_key,
				 stripe_configurations.webhook_secret
		  FROM stripe_configurations
		  WHERE stripe_configurations.org_id = ${Number(org_id)}
			AND stripe_configurations.is_active = true
		`;
      const webhookResult = await zcql.executeZCQLQuery(webhookQuery);
      if (!webhookResult || webhookResult.length === 0) {
        throw new Error("Stripe config not found for webhook verification");
      }
      stripeConfig = webhookResult[0].stripe_configurations;
    }

    const stripe = new Stripe(
      stripeConfig?.stripe_secret_key || process.env.STRIPE_SECRET_KEY
    );

    // Verify webhook
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      stripeConfig?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✅ Webhook verified successfully");
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // =========================
  // HANDLE CHECKOUT EVENTS
  // =========================
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object;
    console.log("📦 Checkout event:", event.type, session.id);

    try {
      const catalystApp = catalyst.initialize(req);
      const zcql = catalystApp.zcql();
      const paymentsTable = catalystApp.datastore().table("payments");

      // 🔧 FIX: include payments.status
      const paymentQuery = `
		  SELECT payments.ROWID,
				 payments.org_id,
				 payments.status
		  FROM payments
		  WHERE payments.provider_payment_id = '${session.id}'
		`;
      const paymentResult = await zcql.executeZCQLQuery(paymentQuery);

      if (!paymentResult || paymentResult.length === 0) {
        throw new Error("Payment row not found for session: " + session.id);
      }

      const paymentRowId = paymentResult[0].payments.ROWID;
      const currentStatus = paymentResult[0].payments.status;

      // 🛑 Idempotency guard
      if (currentStatus === "SUCCESS") {
        console.log("Payment already SUCCESS, skipping update");
        return res.json({ received: true });
      }

      // ✅ SUCCESS
      if (event.type === "checkout.session.completed") {
        await paymentsTable.updateRow({
          ROWID: paymentRowId,
          status: "SUCCESS",
        });
        console.log("✅ Payment status updated to SUCCESS");
      }

      // ❌ FAILED
      if (
        event.type === "checkout.session.expired" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        await paymentsTable.updateRow({
          ROWID: paymentRowId,
          status: "FAILED",
        });
        console.log("❌ Payment status updated to FAILED");
      }
    } catch (err) {
      console.error("🔥 Payment update failed:", err);
    }
  } else {
    console.log("ℹ️ Ignored event type:", event.type);
  }

  return res.status(200).json({ received: true });
});
/**
 * =========================
 * GET PAYMENT STATUS (POLLING)
 * =========================
 */
app.get("/payment-status/:payment_id", async (req, res) => {
  const { payment_id } = req.params;

  if (!payment_id) {
    return res.status(400).json({
      success: false,
      message: "payment_id is required",
    });
  }

  try {
    const catalystApp = catalyst.initialize(req);
    const paymentsTable = catalystApp.datastore().table("payments");

    // Fetch payment row using getRow
    const paymentRow = await paymentsTable.getRow(payment_id);
    console.log("PAYMENT RESPONSE---", paymentRow);

    if (!paymentRow) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      payment_id: paymentRow.ROWID,
      status: paymentRow.status,
      amount: paymentRow.amount,
      currency: paymentRow.currency,
      provider: paymentRow.provider,
      time: paymentRow.MODIFIEDTIME,
    });
  } catch (err) {
    console.error("🔥 Fetch payment status failed:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment status",
    });
  }
});

module.exports = app;
