import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Use service role for full access

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log('--- Checking Supabase Database ---');
    console.log('URL:', supabaseUrl);

    // 1. Check Articles
    const { data: articles, count: articleCount, error: articleError } = await supabase
        .from('articles')
        .select('*', { count: 'exact' });

    if (articleError) {
        console.error('Error fetching articles:', articleError);
    } else {
        console.log(`\n[Articles] Count: ${articleCount}`);
        if (articles.length > 0) {
            console.log('Recent 2 articles:');
            articles.slice(0, 2).forEach(a => {
                console.log(`- ${a.title} (${a.created_at})`);
            });
        }
    }

    // 2. Check Schedules
    const { data: schedules, error: scheduleError } = await supabase
        .from('schedules')
        .select('*');

    if (scheduleError) {
        console.error('Error fetching schedules:', scheduleError);
    } else {
        console.log(`\n[Schedules] Count: ${schedules.length}`);
        schedules.forEach(s => {
            console.log(`- Category: ${s.category}, Status: ${s.status}, Last Run: ${s.last_run}`);
        });
    }

    // 3. Check Settings
    const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('*');

    if (settingsError) {
        console.error('Error fetching settings:', settingsError);
    } else {
        console.log(`\n[Settings] Count: ${settings.length}`);
        settings.forEach(s => {
            console.log(`- ID: ${s.id}, Site Title: ${s.site_title}`);
        });
    }
}

checkDatabase();
