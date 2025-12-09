import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// Create a single supabase client for interacting with your database
const supabase = createClient(config.db.url, config.db.publishableKey);

export default supabase;
