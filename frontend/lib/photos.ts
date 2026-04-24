const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "smart-city-tunisia";

export const getPhotoUrl = (url: string | undefined): string | null => {
  if (!url) return null;
  
  // Skip blob URLs
  if (url.startsWith("blob:")) return null;
  
  // Already a full HTTPS URL
  if (url.startsWith("https://")) return url;
  
  // Handle HTTP URLs (local uploads) - convert to HTTPS or keep as is
  if (url.startsWith("http://")) return url;
  
  // Protocol-relative URL (//cloudinary...)
  if (url.startsWith("//")) return `https:${url}`;
  
  // Cloudinary public ID or partial path - construct full URL
  // Handle different formats: uploaded files, old format, etc.
  if (url.includes("/upload/")) {
    // Already has upload path but missing cloud name
    if (!url.includes(CLOUDINARY_CLOUD)) {
      return url.replace("/upload/", `/upload/${CLOUDINARY_CLOUD}/`);
    }
    return url;
  }
  
  // Raw public ID - construct full Cloudinary URL
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/v1/${url}`;
};

export const getPhotoCount = (media: Array<{ url?: string }> | undefined): number => {
  if (!media || !Array.isArray(media)) return 0;
  return media.filter(m => m.url && !m.url.startsWith("blob:")).length;
};

export const formatPhotoCount = (media: Array<{ url?: string }> | undefined): string => {
  const count = getPhotoCount(media);
  if (count === 0) return "No photos attached";
  return `Photo${count > 1 ? "s" : ""} (${count})`;
};