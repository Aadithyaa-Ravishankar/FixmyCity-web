import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmsjmmtkdqjamsphsulv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtc2ptbXRrZHFqYW1zcGhzdWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM2MjAsImV4cCI6MjA3MzI0OTYyMH0.xWc55lDPqKgMxXU6eoDsy2KMBzqwRL4AslSjrNE9ZJM';

export const supabase = createClient(supabaseUrl, supabaseKey);
