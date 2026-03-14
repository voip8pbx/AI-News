import { supabase } from "../supabase";

export const settingsApi = {

  // Get current active settings
  getSettings: async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('active_text_provider, active_image_provider, ai_providers, article_expiry_days, cron_schedule')
      .eq('id', 'model_config')
      .single();

    if (error) throw error;

    return {
      activeTextProvider: data.active_text_provider,
      activeImageProvider: data.active_image_provider,
      aiProviders: data.ai_providers || [],
      articleExpiryDays: data.article_expiry_days,
      cronSchedule: data.cron_schedule
    };
  },

  updateSettings: async (settingsData) => {
    const dbUpdate = {};
    if (settingsData.activeTextProvider !== undefined) dbUpdate.active_text_provider = settingsData.activeTextProvider;
    if (settingsData.activeImageProvider !== undefined) dbUpdate.active_image_provider = settingsData.activeImageProvider;
    if (settingsData.aiProviders !== undefined) dbUpdate.ai_providers = settingsData.aiProviders;
    if (settingsData.articleExpiryDays !== undefined) dbUpdate.article_expiry_days = settingsData.articleExpiryDays;
    if (settingsData.cronSchedule !== undefined) dbUpdate.cron_schedule = settingsData.cronSchedule;

    const { data, error } = await supabase
      .from('settings')
      .update(dbUpdate)
      .eq('id', 'model_config')
      .select()
      .single();

    if (error) throw error;
    return {
      activeTextProvider: data.active_text_provider,
      activeImageProvider: data.active_image_provider,
      aiProviders: data.ai_providers || []
    };
  },

  // Update settings via UI neural sync logic (since backend is gone, we'll patch it locally)
  syncSmartKeys: async (syncInputs) => {
    // Generate an automatic array of providers based on what's passed in
    const newProviders = [];
    if (syncInputs.textKey) {
      newProviders.push({
        name: "Groq Fast Synthesis",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: syncInputs.textKey,
        payloadStructure: "openai",
        textModel: "llama3-8b-8192",
        category: "text"
      });
    }

    const dbUpdate = {
      ai_providers: newProviders,
      active_text_provider: newProviders.length > 0 ? newProviders[0].name : "None",
    };

    const { error } = await supabase
      .from('settings')
      .update(dbUpdate)
      .eq('id', 'model_config');

    if (error) throw error;
    return { success: true };
  },

  // Analytics aggregations for Overview
  getAnalytics: async () => {
    // Basic sums
    const { count: articlesCount } = await supabase.from('articles').select('*', { count: 'exact', head: true });

    // Aggregate categories for the Chart
    const { data: categories } = await supabase.from('categories').select('name');
    const { data: articles } = await supabase.from('articles').select('category, views, created_at, title, category_slug');
    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });

    let distribution = [];
    let ranking = [];
    let totalViews = 0;
    let topRaw = [];

    if (categories && articles) {
      const counts = {};
      const views = {};

      articles.forEach(a => {
        counts[a.category] = (counts[a.category] || 0) + 1;
        views[a.category] = (views[a.category] || 0) + (a.views || 0);
        totalViews += (a.views || 0);
        topRaw.push({ label: a.title?.substring(0, 20) + '...', views: a.views || 0 });
      });

      categories.forEach(c => {
        distribution.push({ category: c.name, count: counts[c.name] || 0 });
        ranking.push({ name: c.name, articleCount: counts[c.name] || 0, totalViews: views[c.name] || 0 });
      });
    }

    // Sort tops
    topRaw.sort((a, b) => b.views - a.views);

    // Returning exact payload tree Analytics.jsx expects
    return {
      success: true,
      data: {
        users: {
          total: usersCount || 0,
          today: 0,
          engagement: { avgSaved: 0 }
        },
        content: {
          total: articlesCount || 0,
          today: articles?.filter(a => new Date(a.created_at).toDateString() === new Date().toDateString()).length || 0,
          totalViews: totalViews,
          topArticles: topRaw.slice(0, 5),
          categoryRanking: ranking.sort((a, b) => b.totalViews - a.totalViews),
          contentWeighting: distribution
        },
        ingestion: {
          activeRulesCount: 1,
          rules: [
            { id: 1, name: "Daily Morning Digest", type: "text", status: "active", schedule: "0 6 * * *", lastSync: new Date().toISOString() }
          ]
        }
      }
    };
  },

  // Set cronjob interval and article expiry
  cronShedule: async (scheduleData) => {
    const { error } = await supabase
      .from('settings')
      .update({
        cron_schedule: scheduleData.cronSchedule,
        article_expiry_days: scheduleData.articleExpiryDays
      })
      .eq('id', 'model_config');

    if (error) throw error;
    return { success: true };
  },
};