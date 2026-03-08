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
    const { admin_token, event_id } = await req.json();

    if (!admin_token || !event_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin token
    const { data: isValid } = await supabase.rpc("verify_admin_token", { p_token: admin_token });
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all photo paths for this event
    const { data: photos } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("event_id", event_id);

    const deletedFiles: string[] = [];
    const errors: string[] = [];

    if (photos && photos.length > 0) {
      const paths = photos.map((p: any) => p.storage_path).filter(Boolean);

      if (paths.length > 0) {
        const { data, error } = await supabase.storage.from("event-photos").remove(paths);
        if (error) errors.push(`event-photos: ${error.message}`);
        else deletedFiles.push(...(data || []).map((f: any) => f.name));
      }
    }

    // Also try to remove the event folder itself (list remaining files)
    const { data: remaining } = await supabase.storage.from("event-photos").list(event_id);
    if (remaining && remaining.length > 0) {
      const paths = remaining.map((f: any) => `${event_id}/${f.name}`);
      await supabase.storage.from("event-photos").remove(paths);
    }

    // Now delete the event from DB (cascades to photos, orders, order_items)
    const { error: deleteError } = await supabase.rpc("admin_delete_event", {
      p_admin_token: admin_token,
      p_event_id: event_id,
    });

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, deleted_files: deletedFiles.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
