// Cloudflare Pages Functions: /api/health

interface Env {
  SANDOGH_KV?: {
    get: (key: string) => Promise<string | null>;
  };
}

export const onRequestGet = async (context: { env: Env }) => {
  const isKvBound = Boolean(context.env && context.env.SANDOGH_KV);
  return new Response(
    JSON.stringify({
      status: "ok",
      platform: "cloudflare_pages",
      service: "صندوق قرض‌الحسنه و پس‌انداز حامی بومگردی",
      kvBound: isKvBound,
      kvStatusMessage: isKvBound 
        ? "✅ پایگاه داده ابری Cloudflare KV با موفقیت متصل و Bind شده است."
        : "⚠️ متغیر SANDOGH_KV هنوز در بخش Bindings کلودفلر تعریف نشده است.",
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

