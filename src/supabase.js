import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lgtgejypqzbmcuzubszv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndGdlanlwcXpibWN1enVic3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MzQ5NjUsImV4cCI6MjA5MzIxMDk2NX0.OJ4dKRo-usKs-J0nkmAL_qnKIV-pmGVwYjp1AHm0yhY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)