import { supabase } from '../supabase';

const mapToCamel = (cat) => ({
  _id: cat.id,
  name: cat.name,
  slug: cat.slug,
  searchQuery: cat.search_query,
  isActive: cat.is_active,
  order: cat.order
});

const categoryApi = {
  getActive: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true }); // default to alphabetical if order isn't strictly set

    if (error) throw error;
    return data.map(mapToCamel);
  },

  getAll: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(mapToCamel);
  },

  create: async (categoryData) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name: categoryData.name,
        slug: categoryData.slug,
        search_query: categoryData.searchQuery,
        is_active: categoryData.isActive !== false
      }])
      .select()
      .single();

    if (error) throw error;
    return mapToCamel(data);
  },

  update: async (id, updateData) => {
    const dbUpdate = {};
    if (updateData.name !== undefined) dbUpdate.name = updateData.name;
    if (updateData.slug !== undefined) dbUpdate.slug = updateData.slug;
    if (updateData.searchQuery !== undefined) dbUpdate.search_query = updateData.searchQuery;
    if (updateData.isActive !== undefined) dbUpdate.is_active = updateData.isActive;

    const { data, error } = await supabase
      .from('categories')
      .update(dbUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToCamel(data);
  },

  delete: async (id) => {
    // Check if URL has migrateToId query param
    let deleteId = id;
    let migrateToId = null;

    if (id.includes('?migrateToId=')) {
      const parts = id.split('?migrateToId=');
      deleteId = parts[0];
      migrateToId = parts[1];
    }

    if (migrateToId) {
      // Migrate articles to new category
      const { data: destCat } = await supabase.from('categories').select('name, slug').eq('id', migrateToId).single();
      if (destCat) {
        await supabase.from('articles').update({
          category: destCat.name,
          category_slug: destCat.slug
        }).eq('category_slug', (await supabase.from('categories').select('slug').eq('id', deleteId).single()).data?.slug);
      }
    } else {
      // Check if articles exist
      const { data: sourceCat } = await supabase.from('categories').select('slug').eq('id', deleteId).single();
      const { count } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('category_slug', sourceCat?.slug);

      if (count > 0) {
        const error = new Error("MIGRATE_NEEDED " + count + " articles");
        error.response = { status: 400, data: { message: "MIGRATE_NEEDED " + count + " articles" } };
        throw error;
      }
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', deleteId);

    if (error) throw error;
    return { success: true };
  }
};

export default categoryApi;