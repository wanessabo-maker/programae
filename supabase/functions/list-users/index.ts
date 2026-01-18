import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the requesting user is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify they're authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
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

    // Use service role client to list all users
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all users from auth.users
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      throw listError;
    }

    // Get all user roles
    const { data: allRoles } = await adminClient
      .from("user_roles")
      .select("user_id, role");

    // Get all team members with their user_id links
    const { data: teamMembers } = await adminClient
      .from("team_members")
      .select("id, name, user_id, area_id, active, areas(name)");

    // Get all user areas
    const { data: allUserAreas } = await adminClient
      .from("user_areas")
      .select("user_id, area");

    // Helper to get area name from areas relation
    const getAreaName = (areas: { name: string } | { name: string }[] | null): string | null => {
      if (!areas) return null;
      if (Array.isArray(areas)) return areas[0]?.name || null;
      return areas.name || null;
    };

    // Map users with their roles, team member links, and areas
    const usersWithRoles = users.map((u) => {
      const linkedTeamMember = teamMembers?.find((tm) => tm.user_id === u.id);
      const userAreas = allUserAreas?.filter((ua) => ua.user_id === u.id).map((ua) => ua.area) || [];
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        roles: allRoles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [],
        areas: userAreas,
        teamMember: linkedTeamMember ? {
          id: linkedTeamMember.id,
          name: linkedTeamMember.name,
          areaId: linkedTeamMember.area_id,
          areaName: getAreaName(linkedTeamMember.areas),
          active: linkedTeamMember.active,
        } : null,
      };
    });

    // Also return available team members (those without user_id or active ones)
    const availableTeamMembers = teamMembers?.map((tm) => ({
      id: tm.id,
      name: tm.name,
      areaId: tm.area_id,
      areaName: getAreaName(tm.areas),
      active: tm.active,
      userId: tm.user_id,
    })) || [];

    return new Response(
      JSON.stringify({ users: usersWithRoles, teamMembers: availableTeamMembers }),
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
