// Cloudflare Pages Functions: /api/data
// Supports Cloudflare KV: EcolodgeFundLoan, SANDOGH_KV, or any bound KV namespace

interface KVNamespace {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
}

interface Env {
  EcolodgeFundLoan?: KVNamespace;
  EcolodgeLoanFund?: KVNamespace;
  SANDOGH_KV?: KVNamespace;
  [key: string]: any;
}

// Dynamically resolve the KV namespace from context.env
function getKV(env: any): KVNamespace | null {
  if (!env || typeof env !== "object") return null;
  // Check exact names first
  if (env.EcolodgeFundLoan && typeof env.EcolodgeFundLoan.get === "function") return env.EcolodgeFundLoan;
  if (env.EcolodgeLoanFund && typeof env.EcolodgeLoanFund.get === "function") return env.EcolodgeLoanFund;
  if (env.SANDOGH_KV && typeof env.SANDOGH_KV.get === "function") return env.SANDOGH_KV;
  // Scan all keys for any KV namespace object
  for (const key of Object.keys(env)) {
    const val = env[key];
    if (val && typeof val.get === "function" && typeof val.put === "function") {
      return val;
    }
  }
  return null;
}

// In-memory fallback if KV is not bound during local preview
let memoryStore: string | null = null;

export const onRequestGet = async (context: { env: Env }) => {
  try {
    let rawData: string | null = null;
    const kv = getKV(context.env);

    if (kv) {
      rawData = await kv.get("sandogh_database");
    } else if (memoryStore) {
      rawData = memoryStore;
    }

    if (!rawData) {
      return new Response(JSON.stringify({ exists: false, data: null }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(
      JSON.stringify({
        exists: true,
        data: JSON.parse(rawData),
        source: kv ? "cloudflare_kv" : "memory",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to read database" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  try {
    const payload = await context.request.json();
    const stringified = JSON.stringify(payload);
    const kv = getKV(context.env);

    if (kv) {
      await kv.put("sandogh_database", stringified);
    } else {
      memoryStore = stringified;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Data securely persisted to Cloudflare storage",
        source: kv ? "cloudflare_kv" : "memory",
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
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to persist data" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
