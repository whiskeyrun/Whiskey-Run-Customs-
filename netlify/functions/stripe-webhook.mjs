
import Stripe from "stripe";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const resendKey = process.env.RESEND_API_KEY;

  if (!stripeKey || !webhookSecret || !resendKey) {
    console.error("Missing webhook configuration");
    return new Response("Configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey);

  let event;
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Webhook verification failed:", error.message);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Do not notify until payment is confirmed.
    if (session.payment_status !== "paid") {
      return new Response("Payment not yet complete", { status: 200 });
    }

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { limit: 100 }
      );

      const products = lineItems.data.map((item) =>
        `${item.description} x ${item.quantity}`
      ).join("\n");

      const amount = ((session.amount_total || 0) / 100)
        .toFixed(2);

      const customer = session.customer_details || {};
      const address = customer.address
        ? [
            customer.address.line1,
            customer.address.line2,
            customer.address.city,
            customer.address.state,
            customer.address.postal_code,
            customer.address.country
          ].filter(Boolean).join(", ")
        : "Not provided";
const supabaseResponse = await fetch(
  `${process.env.SUPABASE_URL}/rest/v1/orders?on_conflict=stripe_session_id`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_SECRET_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({
      customer_email: customer.email || null,
      customer_name: customer.name || null,
      items: lineItems.data.map(item => ({
        name: item.description,
        quantity: item.quantity,
        amount_total: item.amount_total
      })),
      total_amount: session.amount_total,
      stripe_session_id: session.id,
      payment_status: session.payment_status
    })
  }
);

if (!supabaseResponse.ok) {
  console.error(
  "Supabase order save failed:",
  supabaseResponse.status,
  await supabaseResponse.text()
);
  return new Response("Order recording failed", { status: 500 });
}
      const emailBody = [
        "New paid order - Whiskey Run Customs",
        "",
        `Stripe Session: ${session.id}`,
        `Customer: ${customer.name || "Not provided"}`,
        `Email: ${customer.email || "Not provided"}`,
        `Shipping address: ${address}`,
        "",
        "Items:",
        products || "See Stripe dashboard",
        "",
        `Total: ${amount} ${session.currency?.toUpperCase() || "USD"}`,
        "",
        "Review this order in your Stripe dashboard."
      ].join("\n");

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Whiskey Run Customs <orders@whiskeyruncustoms.com>",
          to: ["whiskeyrun1414@gmail.com"],
          subject: "New Paid Order - Whiskey Run Customs",
          text: emailBody
        })
      });

      if (!response.ok) {
        console.error("Resend delivery failed:", response.status);
        return new Response("Email delivery failed", { status: 500 });
      }

    } catch (error) {
      console.error("Order notification error:", error);
      return new Response("Notification failed", { status: 500 });
    }
  }

  return new Response("Received", { status: 200 });
};
