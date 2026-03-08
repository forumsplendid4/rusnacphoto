import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { admin_token, paths } = await req.json();

    if (!admin_token || !Array.isArray(paths) || paths.length === 0) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin token
    const { data: isValid } = await supabase.rpc("verify_admin_token", {
      p_token: admin_token,
    });

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign URLs for event-originals bucket
    const signedUrls: Record<string, string> = {};

    for (const path of paths) {
      const { data, error } = await supabase.storage
        .from("event-originals")
        .createSignedUrl(path, 3600);

      if (error) {
        // Fallback to event-photos if original not in event-originals
        const { data: fallback } = await supabase.storage
          .from("event-photos")
          .createSignedUrl(path, 3600);
        if (fallback?.signedUrl) {
          signedUrls[path] = fallback.signedUrl;
        }
      } else if (data?.signedUrl) {
        signedUrls[path] = data.signedUrl;
      }
    }

    return new Response(JSON.stringify({ signed_urls: signedUrls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
