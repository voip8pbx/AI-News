import { supabase } from '../supabase';

/**
 * Database service for handling article storage and retrieval
 */
class DatabaseService {
  /**
   * Insert articles into the database with duplicate prevention
   * @param {Array} articles - Array of normalized articles to insert
   * @param {string} categorySlug - Category slug for the articles
   * @returns {Promise<Object>} - Insert results with statistics
   */
  async insertArticles(articles, categorySlug) {
    if (!Array.isArray(articles) || articles.length === 0) {
      return { success: true, inserted: 0, duplicates: 0, errors: [] };
    }

    const results = {
      success: true,
      inserted: 0,
      duplicates: 0,
      errors: []
    };

    console.log(`[DatabaseService] Inserting ${articles.length} articles for category: ${categorySlug}`);

    try {
      // Process articles in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        await this.processBatch(batch, categorySlug, results);
      }

      console.log(`[DatabaseService] Batch insert completed:`, {
        inserted: results.inserted,
        duplicates: results.duplicates,
        errors: results.errors.length
      });

    } catch (error) {
      console.error('[DatabaseService] Batch insert failed:', error);
      results.success = false;
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Process a batch of articles
   * @param {Array} batch - Batch of articles to process
   * @param {string} categorySlug - Category slug
   * @param {Object} results - Results object to update
   */
  async processBatch(batch, categorySlug, results) {
    for (const article of batch) {
      try {
        // Check if article already exists
        const { data: existing, error: checkError } = await supabase
          .from('articles')
          .select('id')
          .eq('url', article.url)
          .maybeSingle();

        if (checkError) {
          console.warn('[DatabaseService] Error checking duplicate:', checkError);
          continue;
        }

        if (existing) {
          results.duplicates++;
          continue;
        }

        // Generate slug from title
        const slug = this.generateSlug(article.title);
        
        // Prepare article data for insertion
        const articleData = {
          title: article.title,
          slug: slug,
          description: article.description || '',
          content: article.content || article.description || '',
          url: article.url,
          banner_image: article.image || null,
          author: article.author || 'GNews',
          category_slug: categorySlug,
          published_at: article.publishedAt || new Date().toISOString(),
          source_name: article.source?.name || 'GNews',
          source_url: article.source?.url || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'published'
        };

        // Insert article
        const { data: inserted, error: insertError } = await supabase
          .from('articles')
          .insert(articleData)
          .select()
          .single();

        if (insertError) {
          // Handle duplicate constraint error gracefully
          if (insertError.code === '23505') {
            results.duplicates++;
            console.log(`[DatabaseService] Duplicate URL skipped: ${article.url}`);
          } else {
            console.error('[DatabaseService] Insert error:', insertError);
            results.errors.push(`Failed to insert "${article.title}": ${insertError.message}`);
          }
        } else {
          results.inserted++;
          console.log(`[DatabaseService] Inserted article: ${article.title}`);
        }

      } catch (error) {
        console.error('[DatabaseService] Error processing article:', error);
        results.errors.push(`Error processing "${article.title}": ${error.message}`);
      }
    }
  }

  /**
   * Generate URL-friendly slug from title
   * @param {string} title - Article title
   * @returns {string} - URL-friendly slug
   */
  generateSlug(title) {
    if (!title) return `article-${Date.now()}`;
    
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .trim();
  }

  /**
   * Get category by slug or create if not exists
   * @param {string} categorySlug - Category slug
   * @param {string} categoryName - Category name
   * @returns {Promise<Object>} - Category data
   */
  async getOrCreateCategory(categorySlug, categoryName = null) {
    try {
      // Try to get existing category
      const { data: category, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', categorySlug)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (category) {
        return category;
      }

      // Create new category if not found
      const displayName = categoryName || this.formatCategoryName(categorySlug);
      const { data: newCategory, error: insertError } = await supabase
        .from('categories')
        .insert({
          name: displayName,
          slug: categorySlug,
          description: `News and articles about ${displayName}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log(`[DatabaseService] Created new category: ${categorySlug}`);
      return newCategory;

    } catch (error) {
      console.error('[DatabaseService] Error getting/creating category:', error);
      throw error;
    }
  }

  /**
   * Format category slug to display name
   * @param {string} slug - Category slug
   * @returns {string} - Formatted category name
   */
  formatCategoryName(slug) {
    if (!slug) return 'General';
    
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get article statistics
   * @returns {Promise<Object>} - Article statistics
   */
  async getArticleStats() {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, category_slug, created_at, status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const stats = {
        total: data.length,
        published: data.filter(a => a.status === 'published').length,
        draft: data.filter(a => a.status === 'draft').length,
        byCategory: {},
        recent: data.filter(a => {
          const createdAt = new Date(a.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return createdAt > weekAgo;
        }).length
      };

      // Count by category
      data.forEach(article => {
        const category = article.category_slug || 'uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      return stats;

    } catch (error) {
      console.error('[DatabaseService] Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old articles (optional maintenance)
   * @param {number} daysOld - Delete articles older than this many days
   * @returns {Promise<Object>} - Cleanup results
   */
  async cleanupOldArticles(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('articles')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) throw error;

      console.log(`[DatabaseService] Cleaned up ${data.length} articles older than ${daysOld} days`);
      
      return {
        success: true,
        deleted: data.length,
        cutoffDate: cutoffDate.toISOString()
      };

    } catch (error) {
      console.error('[DatabaseService] Error during cleanup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent articles for monitoring
   * @param {number} limit - Number of articles to retrieve
   * @returns {Promise<Array>} - Recent articles
   */
  async getRecentArticles(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('[DatabaseService] Error getting recent articles:', error);
      return [];
    }
  }
}

// Create singleton instance
export const databaseService = new DatabaseService();

export default databaseService;
