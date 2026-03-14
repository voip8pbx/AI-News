/**
 * cloudinaryService.js
 * 
 * Utility for uploading images to Cloudinary using the REST API.
 * This handles signed uploads to avoid exposing the Secret in an insecure way,
 * although in a pure Vite app, the secret is technically still in the client bundle
 * if used here. 
 * 
 * IMPORTANT: For production, signatures should be generated on a backend.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET;

/**
 * Generate a SHA-1 signature for Cloudinary signed uploads
 * @param {string} stringToSign 
 * @returns {Promise<string>}
 */
async function generateSignature(stringToSign) {
  const msgUint8 = new TextEncoder().encode(stringToSign + API_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Upload an image (from URL or File) to Cloudinary
 * @param {string|File|Blob} fileData - Image URL or File object
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (fileData, folder = 'news_articles') => {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('[Cloudinary] Missing configuration. Check your .env file.');
    return typeof fileData === 'string' ? fileData : null;
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = await generateSignature(paramsToSign);

    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    console.log('[Cloudinary] ✓ Image uploaded successfully:', data.secure_url);
    return data.secure_url;

  } catch (error) {
    console.error('[Cloudinary] ✗ Upload failed:', error.message);
    // Return original if it's a URL as fallback
    return typeof fileData === 'string' ? fileData : null;
  }
};

export default { uploadToCloudinary };
