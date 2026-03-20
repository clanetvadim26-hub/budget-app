import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL  || 'https://pptsqrouyjybnnmwqezi.supabase.co';
const key = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_R1QsnH0SsXvXuk7n7IgOXA_sJWyd3aB';

export const supabase = createClient(url, key);
