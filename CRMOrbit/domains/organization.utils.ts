import type { Organization } from "./organization";

/**
 * Extract domain from a website URL
 */
export const extractDomain = (website: string): string | null => {
  const trimmed = website.trim();
  if (!trimmed) {
    return null;
  }

  // Add protocol if missing
  const urlString = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  const match = urlString.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);
  if (!match) {
    return null;
  }

  const host = match[1] ?? "";
  const hostname = host.split(":")[0];
  if (!hostname) {
    return null;
  }

  return hostname.replace(/^www\./, "");
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
