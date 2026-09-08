const SUPABASE_URL =
  "COLE_AQUI_SUA_SUPABASE_URL";

const SUPABASE_ANON_KEY =
  "COLE_AQUI_SUA_ANON_KEY";


const db =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
