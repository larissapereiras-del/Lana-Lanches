const SUPABASE_URL =
 "https://ifbecuswojeufycovodo.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_02RDlrIN-ppJOfrZAy-1DQ_HLizQvbZ";


const db =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
