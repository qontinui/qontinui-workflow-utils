/**
 * Skill Versioning Utilities
 *
 * Provides semantic version bumping and update detection for skills.
 */

export type VersionBumpType = "patch" | "minor" | "major";

/**
 * Parse a semantic version string into components.
 */
export function parseVersion(
  version: string,
): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Bump a semantic version string.
 */
export function bumpVersion(version: string, type: VersionBumpType): string {
  const parsed = parseVersion(version);
  if (!parsed) return "1.0.0"; // fallback

  switch (type) {
    case "major":
      return `${parsed.major + 1}.0.0`;
    case "minor":
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case "patch":
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
}

/**
 * Compare two version strings. Returns:
 * - positive if a > b
 * - negative if a < b
 * - 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a) ?? { major: 0, minor: 0, patch: 0 };
  const pb = parseVersion(b) ?? { major: 0, minor: 0, patch: 0 };

  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

/**
 * Check if a skill has an available update based on checksum comparison.
 *
 * @param localSkill - The locally installed skill
 * @param remoteSkill - The skill from the remote source (import file, org catalog)
 * @returns true if the remote version is newer or has different content
 */
export function hasUpdate(
  localSkill: { version?: string; checksum?: string },
  remoteSkill: { version?: string; checksum?: string },
): boolean {
  // If versions differ, compare them
  if (localSkill.version && remoteSkill.version) {
    if (compareVersions(remoteSkill.version, localSkill.version) > 0) {
      return true;
    }
  }

  // If checksums differ, there's a content change
  if (localSkill.checksum && remoteSkill.checksum) {
    return localSkill.checksum !== remoteSkill.checksum;
  }

  return false;
}
