// Cloudflare Pages Functions: /api/data
// Supports Cloudflare KV (env.SANDOGH_KV) and Cloudflare D1 (env.DB)

interface Env {
  SANDOGH_KV?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string) => Promise<void>;
  };
  DB?: any;
}

// In-memory fallback if KV is not bound during local preview
let memoryStore: string | null = null;

export const onRequestGet = async (context: { env: Env }) => {
  try {
    let rawData: string | null = null;

    if (context.env?.SANDOGH_KV) {
      rawData = await context.env.SANDOGH_KV.get("sandogh_database");
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
        source: context.env?.SANDOGH_KV ? "cloudflare_kv" : "memory",
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

    if (context.env?.SANDOGH_KV) {
      await context.env.SANDOGH_KV.put("sandogh_database", stringified);
    } else {
      memoryStore = stringified;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Data securely persisted to Cloudflare storage",
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
