import Stripe from "stripe";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405
    });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { items } = await request.json();

    const products = {
      4: { name: "Laser-Engraved RFID Wallets", amount: 6000 },
      5: { name: "Slate Coasters", amount: 2000 },
      6: { name: "Small Slate Charcuterie Boards", amount: 2500 },
      7: { name: "Large Slate Charcuterie Boards", amount: 5000 }
    };

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Invalid cart");
    }

    const line_items = items.map((item) => {
      const product = products[item.id];
      
const qty = item.quantity;


      if (!product || !Number.isInteger(qty) ||
          qty < 1 || qty > 50) {
        throw new Error("Invalid item");
      }

      return {
        price_data: {
          currency: "usd",
          product_data: { name: product.name },
          unit_amount: product.amount
        },
        quantity: qty
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
    return Response.json(
      { error: "Unable to start checkout" },
      { status: 400 }
    );
  }
};
