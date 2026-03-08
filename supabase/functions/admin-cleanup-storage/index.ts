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
    const { admin_token } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: isValid } = await supabase.rpc("verify_admin_token", { p_token: admin_token });
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all existing event IDs
    const { data: events } = await supabase.from("events").select("id");
    const validIds = new Set((events || []).map((e: any) => e.id));

    let totalDeleted = 0;

    for (const bucket of ["event-photos", "event-originals"]) {
      // List top-level folders
      const { data: folders } = await supabase.storage.from(bucket).list("", { limit: 1000 });
      if (!folders) continue;

      for (const folder of folders) {
        // folder.name is the event_id
        if (validIds.has(folder.name)) continue; // skip active events

        // List all files in orphaned folder
        const { data: files } = await supabase.storage.from(bucket).list(folder.name, { limit: 10000 });
        if (!files || files.length === 0) continue;

        const paths = files.map((f: any) => `${folder.name}/${f.name}`);
        const { error } = await supabase.storage.from(bucket).remove(paths);
        if (!error) totalDeleted += paths.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, deleted: totalDeleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
