/**
 * Robust date formatting utility for the Verbis AI platform
 * Handles various date formats and provides fallbacks for invalid dates
 */

// Format date with fallback for invalid dates
export const formatDate = (dateString, options = {}) => {
  if (!dateString) {
    console.warn('[DateUtils] No date string provided');
    return options.fallback || 'No date';
  }

  try {
    const date = new Date(dateString);
    
    // Check if date is invalid
    if (isNaN(date.getTime())) {
      console.warn('[DateUtils] Invalid date string:', dateString, 'Type:', typeof dateString);
      return options.fallback || 'Invalid date';
    }

    // Default options
    const defaultOptions = {
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    };

    const formatOptions = { ...defaultOptions, ...options };
    return date.toLocaleDateString('en-US', formatOptions);
  } catch (error) {
    console.error('[DateUtils] Error formatting date:', error, dateString);
    return options.fallback || 'Date error';
  }
};

// Format relative time (e.g., "2 hours ago", "3 days ago")
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'No date';

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('[DateUtils] Invalid date for relative time:', dateString);
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    } else if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.error('[DateUtils] Error formatting relative time:', error, dateString);
    return 'Date error';
  }
};

// Format date for article cards (short format)
export const formatArticleDate = (dateString) => {
  if (!dateString) {
    console.warn('[DateUtils] No date string provided');
    return 'No date';
  }

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('[DateUtils] Invalid date string for article:', dateString, 'Type:', typeof dateString);
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older dates, show the actual date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch (error) {
    console.error('[DateUtils] Error formatting article date:', error, dateString);
    return 'Date error';
  }
};

// Validate if a date string is valid
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

// Get ISO date string (for database storage)
export const getISOString = () => {
  return new Date().toISOString();
};
