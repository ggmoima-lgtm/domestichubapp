/**
 * Masks phone numbers, emails, WhatsApp links, and social handles from text.
 * Used to prevent employers from bypassing payment by extracting contact info from bios.
 */

const patterns = [
  // Phone numbers: various formats (international, local, with spaces/dashes/dots)
  /(\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g,
  // Email addresses
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  // WhatsApp links
  /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/[^\s]+/gi,
  // Social handles @username
  /@[a-zA-Z0-9_]{3,30}/g,
  // Facebook/Instagram/Twitter/TikTok URLs
  /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|instagram|twitter|x|tiktok|linkedin)\.com\/[^\s]+/gi,
  // "call me" / "whatsapp me" patterns with numbers
  /(?:call|whatsapp|text|sms|message)\s*(?:me\s*)?(?:at|on|@)?\s*[\d\s\-+().]{7,}/gi,
];

export function maskContactInfo(text: string): string {
  let masked = text;
  for (const pattern of patterns) {
    masked = masked.replace(pattern, "••••••••");
  }
  return masked;
}

/**
 * Returns only the first name from a full name string.
 */
export function getPreviewName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] + (parts.length > 1 ? " " + parts[1][0] + "." : "");
}
