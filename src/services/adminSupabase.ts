import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE || "";

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
