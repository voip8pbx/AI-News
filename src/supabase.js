import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xuoeucsdqnowjwvglvul.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1b2V1Y3NkcW5vd2p3dmdsdnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTgzMjYsImV4cCI6MjA4NzQzNDMyNn0.bNgZXpcxlITNuwj4nDdqCnUaEScJuod7XJociKpmq8g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
