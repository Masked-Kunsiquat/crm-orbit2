import type { Organization, OrganizationStatus } from "./organization";

/**
 * Type guard for organization status
 */
const isOrganizationStatus = (
  value: unknown,
): value is OrganizationStatus => {
  return (
    typeof value === "string" &&
    (value === "organization.status.active" ||
      value === "organization.status.inactive")
  );
};

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

/**
 * Build organization state from event payload.
 * Used by both reducers and timeline rendering for consistent state derivation.
 *
 * @param id - Organization entity ID
 * @param payload - Event payload (may be partial for updates)
 * @param timestamp - Event timestamp
 * @param existing - Existing organization state (for updates)
 * @returns Complete organization state
 */
export const buildOrganizationFromPayload = (
  id: string,
  payload: Record<string, unknown>,
  timestamp: string,
  existing?: Organization,
): Organization => ({
  id,
  name:
    typeof payload.name === "string" ? payload.name : (existing?.name ?? ""),
  status: isOrganizationStatus(payload.status)
    ? payload.status
    : (existing?.status ?? "organization.status.active"),
  logoUri:
    typeof payload.logoUri === "string" ? payload.logoUri : existing?.logoUri,
  website:
    typeof payload.website === "string" ? payload.website : existing?.website,
  socialMedia:
    payload.socialMedia !== undefined
      ? (payload.socialMedia as Organization["socialMedia"])
      : existing?.socialMedia,
  metadata:
    payload.metadata !== undefined
      ? (payload.metadata as Record<string, unknown>)
      : existing?.metadata,
  createdAt: existing?.createdAt ?? timestamp,
  updatedAt: timestamp,
});
