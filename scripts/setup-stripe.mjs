/**
 * Create Koharu Plus/VIP Stripe products + prices, optional webhook.
 *
 * Usage:
 *   set STRIPE_SECRET_KEY=sk_test_...
 *   node scripts/setup-stripe.mjs
 *
 * Or:
 *   node scripts/setup-stripe.mjs sk_test_...
 */

import Stripe from "stripe";

const key = (process.argv[2] || process.env.STRIPE_SECRET_KEY || "").trim();
if (!key || !key.startsWith("sk_")) {
  console.error(
    "Usage: node scripts/setup-stripe.mjs sk_test_xxx\n" +
      "   or: set STRIPE_SECRET_KEY=sk_test_xxx && node scripts/setup-stripe.mjs",
  );
  process.exit(1);
}

const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
const stripe = new Stripe(key);
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://thekoharuproject.com";
const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/stripe/webhook`;

const PLANS = [
  {
    env: "STRIPE_PRICE_PLUS",
    name: "Koharu Plus",
    description: "IRL photo vault access — The Koharu Project",
    unitAmount: 1200, // $12.00
    metadata: { plan: "plus" },
  },
  {
    env: "STRIPE_PRICE_VIP",
    name: "Koharu VIP",
    description: "Full photo + video vault — The Koharu Project",
    unitAmount: 2900, // $29.00
    metadata: { plan: "vip" },
  },
];

async function findOrCreateProduct(plan) {
  const existing = await stripe.products.search({
    query: `name~'${plan.name}' AND active:'true'`,
    limit: 5,
  });
  if (existing.data[0]) {
    console.log(`  product exists: ${existing.data[0].id} (${plan.name})`);
    return existing.data[0];
  }
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: plan.metadata,
  });
  console.log(`  product created: ${product.id} (${plan.name})`);
  return product;
}

async function findOrCreatePrice(productId, plan) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 20,
  });
  const match = prices.data.find(
    (p) =>
      p.recurring?.interval === "month" &&
      p.unit_amount === plan.unitAmount &&
      p.currency === "usd",
  );
  if (match) {
    console.log(`  price exists: ${match.id} ($${(plan.unitAmount / 100).toFixed(2)}/mo)`);
    return match;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.unitAmount,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: plan.metadata,
  });
  console.log(`  price created: ${price.id} ($${(plan.unitAmount / 100).toFixed(2)}/mo)`);
  return price;
}

async function ensureWebhook() {
  const list = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = list.data.find((w) => w.url === webhookUrl);
  const events = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];
  if (existing) {
    console.log(`  webhook exists: ${existing.id}`);
    console.log(
      "  (signing secret only shown at creation — use Dashboard if you lost it)",
    );
    return { id: existing.id, secret: null };
  }
  const wh = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: events,
    description: "The Koharu Project memberships",
  });
  console.log(`  webhook created: ${wh.id}`);
  console.log(`  STRIPE_WEBHOOK_SECRET=${wh.secret}`);
  return { id: wh.id, secret: wh.secret };
}

async function main() {
  console.log(`\nKoharu Stripe setup (${mode})\n`);

  const me = await stripe.accounts.retrieve();
  console.log(`Account: ${me.settings?.dashboard?.display_name || me.id}\n`);

  const env = {
    STRIPE_SECRET_KEY: key,
    STRIPE_PRICE_PLUS: "",
    STRIPE_PRICE_VIP: "",
    STRIPE_WEBHOOK_SECRET: "",
    NEXT_PUBLIC_APP_URL: baseUrl,
  };

  for (const plan of PLANS) {
    console.log(plan.name);
    const product = await findOrCreateProduct(plan);
    const price = await findOrCreatePrice(product.id, plan);
    env[plan.env] = price.id;
  }

  console.log("\nWebhook");
  try {
    const wh = await ensureWebhook();
    if (wh.secret) env.STRIPE_WEBHOOK_SECRET = wh.secret;
  } catch (e) {
    console.warn("  webhook setup skipped:", e.message);
    console.warn("  Add endpoint manually:", webhookUrl);
  }

  console.log("\n=== Env to set ===\n");
  for (const [k, v] of Object.entries(env)) {
    if (v) console.log(`${k}=${v}`);
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.log(
      "\n# Get STRIPE_WEBHOOK_SECRET from Stripe Dashboard → Webhooks → your endpoint → Reveal",
    );
  }

  // Write machine-readable result for the agent
  const out = {
    mode,
    STRIPE_SECRET_KEY: key,
    STRIPE_PRICE_PLUS: env.STRIPE_PRICE_PLUS,
    STRIPE_PRICE_VIP: env.STRIPE_PRICE_VIP,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET || null,
    webhookUrl,
  };
  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(process.cwd(), "data", "stripe-setup-result.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${outPath} (gitignored via /data/)\n`);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
