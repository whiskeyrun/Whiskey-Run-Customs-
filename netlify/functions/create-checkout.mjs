
import Stripe from "stripe";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { items } = await request.json();

    const prices = {
      wallet: { name: "RFID Wallet", amount: 6000 },
      coasters: { name: "Slate Coasters", amount: 2000 },
      small_slate: { name: "Small Slate Charcuterie Board", amount: 2500 },
      large_slate: { name: "Large Slate Charcuterie Board", amount: 5000 }
    };

    if (!Array.isArray(items) || items.length === 0) {
      return new Response("Invalid cart", { status: 400 });
    }

    const line_items = items.map((item) => {
      const product = prices[item.id];
      if (!product || !Number.isInteger(item.quantity) ||
          item.quantity < 1 || item.quantity > 50) {
        throw new Error("Invalid item");
      }
      return {
        price_data: {
          currency: "usd",
          product_data: { name: product.name },
          unit_amount: product.amount
        },
        quantity: item.quantity
      };
    });

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancelled`
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error.message);
    return new Response("Unable to create checkout", { status: 400 });
  }
};
  
