import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://programae.lovable.app",
  "https://id-preview--04beb7ed-ac3f-4bc0-847c-d8e68594dad9.lovable.app",
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
};

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      throw listError;
    }

    const { data: allRoles } = await adminClient
      .from("user_roles")
      .select("user_id, role");

    const { data: teamMembers } = await adminClient
      .from("team_members")
      .select("id, name, user_id, area_id, active, areas(name)");

    const { data: allUserAreaAssignments } = await adminClient
      .from("user_area_assignments")
      .select("user_id, area_id, areas(id, name)");

    const { data: allAreas } = await adminClient
      .from("areas")
      .select("id, name")
      .order("name");

    const getAreaName = (areas: { name: string } | { name: string }[] | null): string | null => {
      if (!areas) return null;
      if (Array.isArray(areas)) return areas[0]?.name || null;
      return areas.name || null;
    };

    const usersWithRoles = users.map((u) => {
      const linkedTeamMember = teamMembers?.find((tm) => tm.user_id === u.id);
      const userAreaAssignments = allUserAreaAssignments?.filter((ua) => ua.user_id === u.id) || [];
      const areaIds = userAreaAssignments.map((ua) => ua.area_id);
      const areaNames = userAreaAssignments.map((ua) => {
        const areaData = ua.areas as { id: string; name: string } | { id: string; name: string }[] | null;
        if (!areaData) return null;
        if (Array.isArray(areaData)) return areaData[0]?.name || null;
        return areaData.name || null;
      }).filter(Boolean);
      
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        roles: allRoles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [],
        areaIds: areaIds,
        areaNames: areaNames,
        teamMember: linkedTeamMember ? {
          id: linkedTeamMember.id,
          name: linkedTeamMember.name,
          areaId: linkedTeamMember.area_id,
          areaName: getAreaName(linkedTeamMember.areas),
          active: linkedTeamMember.active,
        } : null,
      };
    });

    const availableTeamMembers = teamMembers?.map((tm) => ({
      id: tm.id,
      name: tm.name,
      areaId: tm.area_id,
      areaName: getAreaName(tm.areas),
      active: tm.active,
      userId: tm.user_id,
    })) || [];

    return new Response(
      JSON.stringify({ 
        users: usersWithRoles, 
        teamMembers: availableTeamMembers,
        areas: allAreas || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error listing users:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
