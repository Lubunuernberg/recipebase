import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nrrqqzswqlcucxqacuvj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycnFxenN3cWxjdWN4cWFjdXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTc0NDEsImV4cCI6MjA5NjIzMzQ0MX0._7RIdDSUYu0dIVbMXQfBZ1pgIYp6jeK_q6JADyeYlC4'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseKey !== 'placeholder'
}

export default supabase
