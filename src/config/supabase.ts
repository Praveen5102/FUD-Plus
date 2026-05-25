import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vzwpetlduiwdvyndpgym.supabase.co";

const supabaseAnonKey = "sb_publishable_05UL4CzC-uY0a7PCaotieA_iQ5o4eTg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
