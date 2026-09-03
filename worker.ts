// Cloudflare Worker entrypoint for ecolodgeloanfund
// Works seamlessly with Cloudflare Workers + Static Assets (wrangler deploy)

interface KVNamespace {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
}

interface Env {
  EcolodgeFundLoan?: KVNamespace;
  SANDOGH_KV?: KVNamespace;
  EcolodgeLoanFund?: KVNamespace;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  [key: string]: any;
}

const KV_DATA_KEY = "fund_master_data_v1";

function getKV(env: Env): { kv: KVNamespace | null; name: string } {
  if (env.EcolodgeFundLoan && typeof env.EcolodgeFundLoan.get === "function") {
    return { kv: env.EcolodgeFundLoan, name: "EcolodgeFundLoan" };
  }
  if (env.SANDOGH_KV && typeof env.SANDOGH_KV.get === "function") {
    return { kv: env.SANDOGH_KV, name: "SANDOGH_KV" };
  }
  if (env.EcolodgeLoanFund && typeof env.EcolodgeLoanFund.get === "function") {
    return { kv: env.EcolodgeLoanFund, name: "EcolodgeLoanFund" };
  }
  for (const key of Object.keys(env)) {
    const val = env[key];
    if (val && typeof val === "object" && typeof val.get === "function" && typeof val.put === "function") {
      return { kv: val as KVNamespace, name: key };
    }
  }
  return { kv: null, name: "" };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const { kv, name: bindingName } = getKV(env);

    // Health check endpoint
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          time: new Date().toISOString(),
          kvBound: !!kv,
          bindingName: bindingName || null,
          availableKeys: Object.keys(env).filter(k => k !== "ASSETS")
        }),
        { headers: corsHeaders }
      );
    }

    // Data endpoint
    if (url.pathname === "/api/data") {
      if (!kv) {
        return new Response(
          JSON.stringify({
            error: "KV storage is not bound in Cloudflare worker.",
            kvBound: false
          }),
          { status: 503, headers: corsHeaders }
        );
      }

      if (request.method === "GET") {
        try {
          let raw = await kv.get("sandogh_database");
          if (!raw) {
            raw = await kv.get(KV_DATA_KEY);
          }
          if (!raw) {
            return new Response(
              JSON.stringify({ exists: false, data: null }),
              { headers: corsHeaders }
            );
          }
          const parsed = JSON.parse(raw);
          return new Response(
            JSON.stringify({ exists: true, data: parsed }),
            { headers: corsHeaders }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || "Failed to read data" }),
            { status: 500, headers: corsHeaders }
          );
        }
      }

      if (request.method === "POST") {
        try {
          const body = await request.text();
          JSON.parse(body); // Validate JSON format
          await kv.put("sandogh_database", body);
          return new Response(
            JSON.stringify({ success: true, savedAt: new Date().toISOString() }),
            { headers: corsHeaders }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || "Failed to write data" }),
            { status: 400, headers: corsHeaders }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders }
      );
    }

    // Static assets fallback (served by Cloudflare Worker Assets)
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};
