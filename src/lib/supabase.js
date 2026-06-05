import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nrrqqzswqlcucxqacuvj.supabase.co'
// Service Role Key für Admin-Zugriff (bypass RLS)
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycnFxenN3cWxjdWN4cWFjdXZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzQ0MSwiZXhwIjoyMDk2MjMzNDQxfQ.eZXHbe0OCMfsx1gTiSdNeq_4bDJFobHA14O2qzdF69s'

export const supabase = createClient(supabaseUrl, serviceKey)

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && 
         serviceKey !== 'placeholder'
}

export default supabase
