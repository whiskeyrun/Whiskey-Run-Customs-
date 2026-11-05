export default async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" }
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Product listing is missing Supabase server configuration.");
    return Response.json({ error: "Product catalog is temporarily unavailable." }, { status: 503 });
  }

  try {
    const url = new URL("/rest/v1/products", supabaseUrl);
    url.search = new URLSearchParams({
      select: "id,name,description,price,image_url,available",
      available: "eq.true",
      order: "id.asc"
    }).toString();

    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      console.error("Supabase product listing failed:", response.status, await response.text());
      return Response.json({ error: "Product catalog is temporarily unavailable." }, { status: 502 });
    }

    const products = await response.json();
    return Response.json(products, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Product listing error:", error.message);
    return Response.json({ error: "Product catalog is temporarily unavailable." }, { status: 502 });
  }
};
