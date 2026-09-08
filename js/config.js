const SUPABASE_URL =
  "sb_publishable_02RDlrIN-ppJOfrZAy-1DQ_HLizQvbZ";

const SUPABASE_ANON_KEY =
  "COLE_AQUI_SUA_ANON_KEY";


const db =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
