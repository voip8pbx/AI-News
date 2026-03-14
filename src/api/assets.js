import { supabase } from "../supabase";

export const assetApi = {
  getAssets: async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('site_title, contact_email, contact_phone, logo, fallback_banner_url')
      .eq('id', 'model_config')
      .single();

    if (error) throw error;

    // Map Postgres snake_case back to camelCase for the UI components
    return {
      siteTitle: data.site_title,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      logo: data.logo,
      fallbackBannerUrl: data.fallback_banner_url
    };
  },

  updateAssets: async (frontendData, files = {}) => {
    // If we're fully migrating to Supabase and avoiding a backend file host, 
    // files would ideally go to Supabase Storage. But for now, we just update text references
    // or rely on Cloudinary's existing URLs passed as strings.

    // Convert to snake_case for DB
    const dbUpdate = {
      site_title: frontendData.siteTitle,
      contact_email: frontendData.contactEmail,
      contact_phone: frontendData.contactPhone,
      logo: frontendData.logo,
      fallback_banner_url: frontendData.fallbackBannerUrl || frontendData.fallbackBanner // Handle backwards compat naming
    };

    const { data, error } = await supabase
      .from('settings')
      .update(dbUpdate)
      .eq('id', 'model_config')
      .select()
      .single();

    if (error) throw error;

    return {
      assets: {
        siteTitle: data.site_title,
        contactEmail: data.contact_email,
        contactPhone: data.contact_phone,
        logo: data.logo,
        fallbackBannerUrl: data.fallback_banner_url
      }
    };
  }
};