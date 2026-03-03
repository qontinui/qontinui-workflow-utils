/**
 * Skill Checksum Utilities
 *
 * SHA-256 checksums for skill integrity verification on export/import.
 */

import type { SkillDefinition } from "@qontinui/shared-types/workflow";

/**
 * Compute a SHA-256 checksum of a skill's content.
 * Only hashes deterministic content fields (not usage_count, approval_status).
 */
export async function computeSkillChecksum(
  skill: SkillDefinition,
): Promise<string> {
  const content = [
    skill.name,
    skill.slug,
    skill.description,
    skill.category,
    ...skill.tags,
    JSON.stringify(skill.template),
    JSON.stringify(skill.parameters),
    skill.version ?? "",
  ].join("|");

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute a checksum for an entire skill export.
 */
export async function computeExportChecksum(
  skills: SkillDefinition[],
): Promise<string> {
  const individualChecksums = await Promise.all(
    skills.map(computeSkillChecksum),
  );
  const combined = individualChecksums.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
