import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 확인하신 실제 값들입니다.
const supabaseUrl = 'https://wsdyrercgbvwlssntwvy.supabase.co'
const supabaseAnonKey = 'sb_publishable_nwueTr0yRhSoQXc6ulPw1g_imYAK6G6'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})