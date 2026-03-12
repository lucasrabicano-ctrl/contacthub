// ─── SUPABASE-CLIENT.JS — Inicialização do cliente Supabase ───
const SUPABASE_URL     = 'https://dhpnlxwmeqklmxsvumzi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRocG5seHdtZXFrbG14c3Z1bXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDQxNTcsImV4cCI6MjA4ODkyMDE1N30.FwNqTy4ON_woYD1X40yBOWCAtgcWGtnQcKxXswS077M';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});
