// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 🔐 Reemplaza estos valores con tus datos reales de Supabase
const SUPABASE_URL = 'https://mxqrzhpyfwuutardehyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
