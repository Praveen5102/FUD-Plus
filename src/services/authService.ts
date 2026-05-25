import { supabase } from "../config/supabase";

import { LoginPayload } from "../types/auth";

export async function loginUser({ email, password }: LoginPayload) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function logoutUser() {
  await supabase.auth.signOut();
}
