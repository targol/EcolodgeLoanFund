// Cloudflare Pages Functions: /api/health

export const onRequestGet = async (context: { env: any }) => {
  const env = context.env || {};
  const kvName = 
    (env.EcolodgeFundLoan && typeof env.EcolodgeFundLoan.get === "function" && "EcolodgeFundLoan") ||
    (env.EcolodgeLoanFund && typeof env.EcolodgeLoanFund.get === "function" && "EcolodgeLoanFund") ||
    Object.keys(env).find(k => env[k] && typeof env[k].get === "function");

  const isKvBound = Boolean(kvName);

  return new Response(
    JSON.stringify({
      status: "ok",
      platform: "cloudflare_pages",
      service: "صندوق قرض‌الحسنه و پس‌انداز حامی بومگردی",
      kvBound: isKvBound,
      bindingName: kvName || "none",
      kvStatusMessage: isKvBound 
        ? `✅ پایگاه داده ابری Cloudflare KV با نام (${kvName}) با موفقیت متصل است.`
        : "⚠️ نام متغیر Workers KV در بخش Settings > Functions > KV namespace bindings هنوز متصل نشده است.",
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

