/**
 * Utility functions for the AgroLink application
 */

/**
 * Format a number as Indian currency (INR)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format as Indian currency
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(numAmount);
};

/**
 * Format a date string to a readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

/**
 * Truncate text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 100) => {
  if (!text) return '';
  if (text.length <= length) return text;
  
  return text.substring(0, length) + '...';
};

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export const getInitials = (name) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Calculate discount percentage
 * @param {number} originalPrice - Original price
 * @param {number} discountedPrice - Discounted price
 * @returns {number} Discount percentage
 */
export const calculateDiscountPercentage = (originalPrice, discountedPrice) => {
  if (!originalPrice || !discountedPrice) return 0;
  
  const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
  return Math.round(discount);
};

/**
 * Get month name from month number (1-12)
 * @param {number} monthNumber - Month number (1-12)
 * @returns {string} Month name
 */
export const getMonthName = (monthNumber) => {
  if (!monthNumber || monthNumber < 1 || monthNumber > 12) return '';
  
  const date = new Date();
  date.setMonth(monthNumber - 1);
  
  return date.toLocaleString('en-US', { month: 'long' });
};

/**
 * Convert file size in bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Human readable file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 