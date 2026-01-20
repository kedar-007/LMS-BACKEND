const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Stripe = require("stripe");
const catalyst = require("zcatalyst-sdk-node"); // ✅ FIXED

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * ⚠️ Stripe webhook needs RAW body
 */
app.use("/stripe-webhook", express.raw({ type: "application/json" }));
app.use(cors());
app.use(express.json());

/**
 * HEALTH CHECK
 */
app.get("/check", (req, res) => {
  console.log("✅ /check endpoint hit");
  return res.status(200).json({ message: "live" });
});

/**
 * CREATE CHECKOUT SESSION
 */
app.post("/create-checkout-session", async (req, res) => {
  console.log("🚀 /create-checkout-session called");
  console.log("📦 Request body:", req.body);

  try {
    const { product, locker_id, user_id, org_id } = req.body;

    if (!product || !locker_id || !user_id || !org_id) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("🔑 Creating Stripe checkout session...");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Locker ${product.name}`,
              images: [
                product.image ||
                "https://dummyimage.com/300x200/000/fff&text=Locker"
              ]
            },
            unit_amount: product.price * 100
          },
          quantity: 1
        }
      ],
      mode: "payment",
      metadata: { locker_id, user_id, org_id },
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`
    });

    console.log("✅ Stripe session created:", session.id);
    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error("🔥 Stripe checkout error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * STRIPE WEBHOOK
 */
app.post("/stripe-webhook", async (req, res) => {
  console.log("📥 Stripe webhook received");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✅ Webhook verified");
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    console.log("💰 Payment success event");

    const session = event.data.object;

    const paymentRecord = {
      stripe_session_id: session.id,
      payment_intent_id: session.payment_intent,
      locker_id: session.metadata.locker_id,
      user_id: session.metadata.user_id,
      org_id: session.metadata.org_id,
      amount: session.amount_total / 100,
      currency: session.currency,
      status: "SUCCESS",
      created_at: new Date()
    };

    try {
      console.log("📡 Connecting to Catalyst");
      const catalystApp = catalyst.initialize(req); // ✅ CORRECT

      const table = catalystApp.datastore().table("Payments");
      await table.insertRow(paymentRecord);

      console.log("✅ Payment stored in Catalyst");
    } catch (dbErr) {
      console.error("🔥 Catalyst DB error:", dbErr);
    }
  }

  res.status(200).json({ received: true });
});

module.exports = app;
