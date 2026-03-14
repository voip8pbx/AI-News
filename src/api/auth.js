import { supabase } from '../supabase';

export const loginUser = async (data) => {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) throw error;

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  // Fetch populated saved and liked articles
  const [savedRes, likedRes] = await Promise.all([
    supabase.from('saved_articles').select('articles(*)').eq('user_id', authData.user.id),
    supabase.from('liked_articles').select('articles(*)').eq('user_id', authData.user.id)
  ]);

  const savedArticles = savedRes.data?.filter(d => d.articles).map(d => ({ ...d.articles, _id: d.articles.id })) || [];
  const likedArticles = likedRes.data?.filter(d => d.articles).map(d => ({ ...d.articles, _id: d.articles.id })) || [];

  const userObj = {
    _id: authData.user.id,
    id: authData.user.id,
    email: authData.user.email,
    role: userProfile?.role || 'user',
    name: userProfile?.name || authData.user.user_metadata?.name || 'User',
    createdAt: authData.user.created_at,
    savedArticles,
    likedArticles
  };

  return {
    data: {
      token: authData.session.access_token,
      user: userObj
    }
  };
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
};

export const registerUser = async (data) => {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        role: 'user'
      }
    }
  });

  if (error) throw error;

  return { data: authData };
};

export const getMe = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not logged in");

  const { data: userProfile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  // Fetch populated saved and liked articles
  const [savedRes, likedRes] = await Promise.all([
    supabase.from('saved_articles').select('articles(*)').eq('user_id', user.id),
    supabase.from('liked_articles').select('articles(*)').eq('user_id', user.id)
  ]);

  const savedArticles = savedRes.data?.filter(d => d.articles).map(d => ({ ...d.articles, _id: d.articles.id })) || [];
  const likedArticles = likedRes.data?.filter(d => d.articles).map(d => ({ ...d.articles, _id: d.articles.id })) || [];

  return {
    _id: user.id,
    id: user.id,
    email: user.email,
    role: userProfile?.role || 'user',
    name: userProfile?.name || user.user_metadata?.name || 'User',
    createdAt: user.created_at,
    savedArticles,
    likedArticles
  };
};

export const getSavedArticles = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_articles')
    .select('article_id')
    .eq('user_id', user.id);

  if (error) return [];

  return data.map(d => ({ _id: d.article_id })); // Mocks the API structure for IDs
};

export const getUserInteractions = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { likedArticleIds: [], savedArticleIds: [] };

  const [savedRes, likedRes] = await Promise.all([
    supabase.from('saved_articles').select('article_id').eq('user_id', user.id),
    supabase.from('liked_articles').select('article_id').eq('user_id', user.id)
  ]);

  return {
    savedArticleIds: savedRes.data ? savedRes.data.map(d => d.article_id) : [],
    likedArticleIds: likedRes.data ? likedRes.data.map(d => d.article_id) : []
  };
};