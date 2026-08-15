// Cloudflare Pages Functions: /api/health

export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({
      status: "ok",
      platform: "cloudflare_pages",
      service: "صندوق قرض‌الحسنه و پس‌انداز حامی بومگردی",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};
