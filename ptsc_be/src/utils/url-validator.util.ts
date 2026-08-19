import { BadRequestException } from '@nestjs/common';

/**
 * Validates if a URL belongs to an allowed list of domains.
 * This prevents arbitrary URL injection.
 */
export function validateUrl(url: string, allowedDomains: string[]): boolean {
  if (!url) return true; // Empty URL is considered "not an injection" here, or handled elsewhere

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check if hostname is in the allowed list
    const isAllowed = allowedDomains.some(domain => {
      try {
        const allowedHost = new URL(domain).hostname.toLowerCase();
        return hostname === allowedHost || hostname.endsWith('.' + allowedHost);
      } catch {
        // If domain in whitelist is just a hostname
        return hostname === domain.toLowerCase() || hostname.endsWith('.' + domain.toLowerCase());
      }
    });

    return isAllowed;
  } catch (error) {
    // If URL is not valid at all, it's safer to reject it if it looks like an absolute URL
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return false;
    }
    // Relative paths are generally okay (unless they are used for SSRF, but here it's for content rendering)
    return true;
  }
}

/**
 * Helper to get allowed domains from environment variables
 */
export function getAllowedDomains(): string[] {
  const envWhitelist = process.env.WHITELIST_DOMAINS
    ? process.env.WHITELIST_DOMAINS.split(',').map(d => d.trim())
    : [];

  const domains = [
    process.env.URL_NESTJS,
    process.env.REDIRECT_URI_FE,
    process.env.KEYCLOAK_DOMAIN_FE,
    process.env.APP_CONVERT_URL,
    process.env.URL_OFFICE,
    process.env.HOST_POST_FILE,
    process.env.KSTT_URL,
    'localhost',
    '127.0.0.1',
    ...envWhitelist,
  ];

  return domains
    .filter(d => !!d)
    .map(d => {
        try {
            return new URL(d!).hostname;
        } catch {
            return d!;
        }
    });
}

/**
 * Validates attachFile URLs in message data
 */
export function validateAttachFileUrls(data: any[]) {
  if (!data || !Array.isArray(data)) return;

  const allowedDomains = getAllowedDomains();

  for (const item of data) {
    if (item && item.attachFile) {
      if (!validateUrl(item.attachFile, allowedDomains)) {
        throw new BadRequestException(`URL không hợp lệ trong attachFile: ${item.attachFile}`);
      }
    }
  }
}
