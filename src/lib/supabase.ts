import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function isActiveSubscription(
  email: string,
  appId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("email", email)
    .eq("app_id", appId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return false;
  if (data.status !== "active") return false;
  if (data.current_period_end) {
    return new Date(data.current_period_end) > new Date();
  }
  return true;
}
