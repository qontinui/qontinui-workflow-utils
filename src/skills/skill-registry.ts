/**
 * Skill Registry
 *
 * Provides search, filter, and lookup functions for skill definitions.
 * Combines built-in skills with user-created skills into a unified catalog.
 */

import type {
  SkillCategory,
  SkillDefinition,
  WorkflowPhase,
} from "@qontinui/shared-types/workflow";
import { BUILTIN_SKILLS } from "./builtin-skills";

// =============================================================================
// Registry State
// =============================================================================

let userSkills: SkillDefinition[] = [];

/**
 * Register user-created skills. Call this when loading from the database.
 */
export function registerUserSkills(skills: SkillDefinition[]): void {
  userSkills = skills;
}

/**
 * Clear all registered user skills.
 */
export function clearUserSkills(): void {
  userSkills = [];
}

/**
 * Get all skills (built-in + user).
 */
export function getAllSkills(): SkillDefinition[] {
  return [...BUILTIN_SKILLS, ...userSkills];
}

// =============================================================================
// Lookup
// =============================================================================

/**
 * Get a skill by its ID.
 */
export function getSkill(id: string): SkillDefinition | undefined {
  return (
    BUILTIN_SKILLS.find((s) => s.id === id) ??
    userSkills.find((s) => s.id === id)
  );
}

/**
 * Get a skill by its slug.
 */
export function getSkillBySlug(slug: string): SkillDefinition | undefined {
  return (
    BUILTIN_SKILLS.find((s) => s.slug === slug) ??
    userSkills.find((s) => s.slug === slug)
  );
}

// =============================================================================
// Filtering
// =============================================================================

/**
 * Get all skills allowed in a given phase.
 */
export function getSkillsByPhase(phase: WorkflowPhase): SkillDefinition[] {
  return getAllSkills().filter((s) => s.allowed_phases.includes(phase));
}

/**
 * Get all skills in a given category.
 */
export function getSkillsByCategory(
  category: SkillCategory,
): SkillDefinition[] {
  return getAllSkills().filter((s) => s.category === category);
}

/**
 * Get all unique categories present in the skill catalog.
 */
export function getSkillCategories(): SkillCategory[] {
  const categories = new Set<SkillCategory>();
  for (const skill of getAllSkills()) {
    categories.add(skill.category);
  }
  return Array.from(categories);
}

// =============================================================================
// Search
// =============================================================================

export interface SkillSearchFilters {
  category?: SkillCategory;
  phase?: WorkflowPhase;
  source?: "builtin" | "user" | "community";
  tags?: string[];
}

/**
 * Search skills by text query and optional filters.
 *
 * Text search matches against name, description, slug, and tags.
 * All filters are AND-combined.
 */
export function searchSkills(
  query: string,
  filters?: SkillSearchFilters,
): SkillDefinition[] {
  let results = getAllSkills();

  // Apply filters
  if (filters?.category) {
    results = results.filter((s) => s.category === filters.category);
  }
  if (filters?.phase) {
    results = results.filter((s) => s.allowed_phases.includes(filters.phase!));
  }
  if (filters?.source) {
    results = results.filter((s) => s.source === filters.source);
  }
  if (filters?.tags && filters.tags.length > 0) {
    results = results.filter((s) =>
      filters.tags!.some((tag) => s.tags.includes(tag)),
    );
  }

  // Apply text search with relevance scoring
  const trimmed = query.trim().toLowerCase();
  if (trimmed) {
    const words = trimmed.split(/\s+/);
    const scored = results
      .map((skill) => {
        const nameLower = skill.name.toLowerCase();
        const slugLower = skill.slug.toLowerCase();
        const descLower = skill.description.toLowerCase();
        const tagsLower = skill.tags.map((t) => t.toLowerCase());
        const haystack = [nameLower, descLower, slugLower, ...tagsLower].join(
          " ",
        );

        if (!words.every((word) => haystack.includes(word))) {
          return null;
        }

        let score = 0;
        if (nameLower === trimmed) score += 100;
        if (slugLower === trimmed) score += 80;
        for (const word of words) {
          if (nameLower.includes(word)) score += 10;
          if (descLower.includes(word)) score += 5;
          for (const tag of tagsLower) {
            if (tag.includes(word)) score += 8;
          }
        }
        return { skill, score };
      })
      .filter(
        (x): x is { skill: SkillDefinition; score: number } => x !== null,
      );

    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.skill);
  }

  return results;
}
