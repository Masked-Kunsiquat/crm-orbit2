import type { Organization } from "./organization";

/**
 * Extract domain from a website URL
 */
export const extractDomain = (website: string): string | null => {
  try {
    // Add protocol if missing
    const urlString = website.startsWith("http")
      ? website
      : `https://${website}`;
    const url = new URL(urlString);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/**
 * Get the logo URL for an organization
 * Priority: logoUri > favicon from website > null
 */
export const getOrganizationLogoUrl = (
  organization: Organization,
  size: 16 | 32 | 64 | 128 | 180 | 192 = 64,
): string | null => {
  // Use logoUri if available
  if (organization.logoUri) {
    return organization.logoUri;
  }

  // Fall back to favicon from twenty-icons.com if website is available
  if (organization.website) {
    const domain = extractDomain(organization.website);
    if (domain) {
      return `https://twenty-icons.com/${domain}/${size}`;
    }
  }

  return null;
};
