import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mwlfmnkpgrjbudfdgnmh.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGZtbmtwZ3JqYnVkZmRnbm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTk0NzUsImV4cCI6MjEwMzk5NTQ3NX0.fCRrWYa_BDIbg9C9B9upNFFVZpvJ_v5YcdUaeI2Bf_k";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
