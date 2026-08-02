/**
 * Normalize display / name fields from email signup or OAuth user_metadata.
 * Google: given_name, family_name, name, email (via openid email profile).
 * Apple: full_name / givenName+familyName on first authorize only.
 */

export type NameFields = {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
};

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function displayNameFromParts(
  firstName: string | null,
  lastName: string | null,
  fallback: string | null = null,
): string | null {
  const parts = [firstName, lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return fallback;
}

/** Read names from Supabase auth user_metadata (email signup + OAuth). */
export function namesFromUserMetadata(
  meta: Record<string, unknown> | undefined | null,
): NameFields {
  const m = meta ?? {};
  const firstName =
    str(m.first_name) ??
    str(m.given_name) ??
    str((m.full_name as { givenName?: string } | undefined)?.givenName) ??
    null;
  const lastName =
    str(m.last_name) ??
    str(m.family_name) ??
    str((m.full_name as { familyName?: string } | undefined)?.familyName) ??
    null;

  let display =
    displayNameFromParts(firstName, lastName) ??
    str(m.full_name) ??
    str(m.name) ??
    str(m.display_name);

  // Apple sometimes stores "Given Family" in name only
  if (!firstName && !lastName && display) {
    const bits = display.split(/\s+/);
    if (bits.length >= 2) {
      return {
        username: str(m.username),
        firstName: bits[0] ?? null,
        lastName: bits.slice(1).join(' '),
        displayName: display,
      };
    }
  }

  return {
    username: str(m.username),
    firstName,
    lastName,
    displayName: display,
  };
}
