/**
 * Unit tests for generateConstraintToml() — the TOML generation function
 * shared by both the runner and web frontend useConstraints hooks.
 *
 * Tests verify that the in-memory constraint model is correctly serialized
 * to TOML format compatible with the Rust `parse_config_str` parser.
 */

import { describe, it, expect } from "vitest";
import { generateConstraintToml, tomlString, tomlStringArray } from "./constraint-toml";
import type {
  Constraint,
  ResourceLimits,
} from "@qontinui/shared-types/constraints";
import { DEFAULT_COMMAND_TIMEOUT_SECS } from "./constraint-utils";

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a builtin constraint with sensible defaults. */
function builtin(suffix: string, enabled = true): Constraint {
  return {
    id: `builtin:${suffix}`,
    name: suffix.replace(/-/g, " "),
    description: `Built-in: ${suffix}`,
    check: { type: "grep_forbidden", pattern: "placeholder" },
    severity: "block",
    enabled,
  };
}

/** Create a custom (project:) constraint with a grep_forbidden check. */
function customGrepForbidden(
  slug: string,
  pattern: string,
  opts?: {
    fileGlob?: string;
    severity?: Constraint["severity"];
    enabled?: boolean;
    description?: string;
  },
): Constraint {
  return {
    id: `project:${slug}`,
    name: slug.replace(/-/g, " "),
    description: opts?.description ?? "",
    check: {
      type: "grep_forbidden",
      pattern,
      ...(opts?.fileGlob ? { file_glob: opts.fileGlob } : {}),
    },
    severity: opts?.severity ?? "block",
    enabled: opts?.enabled ?? true,
  };
}

/** Create a custom constraint with a grep_required check. */
function customGrepRequired(
  slug: string,
  pattern: string,
  opts?: { fileGlob?: string },
): Constraint {
  return {
    id: `project:${slug}`,
    name: slug.replace(/-/g, " "),
    description: "",
    check: {
      type: "grep_required",
      pattern,
      ...(opts?.fileGlob ? { file_glob: opts.fileGlob } : {}),
    },
    severity: "warn",
    enabled: true,
  };
}

/** Create a custom constraint with a file_scope check. */
function customFileScope(slug: string, allowedPaths: string[]): Constraint {
  return {
    id: `project:${slug}`,
    name: slug.replace(/-/g, " "),
    description: "",
    check: { type: "file_scope", allowed_paths: allowedPaths },
    severity: "block",
    enabled: true,
  };
}

/** Create a custom constraint with a command check. */
function customCommand(
  slug: string,
  cmd: string,
  opts?: { cwd?: string; timeoutSecs?: number },
): Constraint {
  return {
    id: `project:${slug}`,
    name: slug.replace(/-/g, " "),
    description: "",
    check: {
      type: "command",
      cmd,
      ...(opts?.cwd ? { cwd: opts.cwd } : {}),
      timeout_secs: opts?.timeoutSecs ?? DEFAULT_COMMAND_TIMEOUT_SECS,
    },
    severity: "block",
    enabled: true,
  };
}

const NO_LIMITS: ResourceLimits = {};

// ============================================================================
// tomlString helper tests
// ============================================================================

describe("tomlString", () => {
  it("wraps a simple string in double quotes", () => {
    expect(tomlString("hello")).toBe('"hello"');
  });

  it("escapes backslashes", () => {
    expect(tomlString("a\\b")).toBe('"a\\\\b"');
  });

  it("escapes double quotes", () => {
    expect(tomlString('say "hi"')).toBe('"say \\"hi\\""');
  });

  it("escapes both backslashes and quotes together", () => {
    expect(tomlString('path\\to\\"file"')).toBe('"path\\\\to\\\\\\"file\\""');
  });

  it("handles empty string", () => {
    expect(tomlString("")).toBe('""');
  });
});

describe("tomlStringArray", () => {
  it("formats single-element array", () => {
    expect(tomlStringArray(["src/"])).toBe('["src/"]');
  });

  it("formats multi-element array", () => {
    expect(tomlStringArray(["src/", "tests/"])).toBe('["src/", "tests/"]');
  });

  it("formats empty array", () => {
    expect(tomlStringArray([])).toBe("[]");
  });

  it("escapes strings within the array", () => {
    expect(tomlStringArray(['path"x', "a\\b"])).toBe('["path\\"x", "a\\\\b"]');
  });
});

// ============================================================================
// generateConstraintToml tests
// ============================================================================

describe("generateConstraintToml", () => {
  // ==========================================================================
  // Empty / Minimal State
  // ==========================================================================

  describe("empty state", () => {
    it("produces minimal output when no constraints and no limits", () => {
      const result = generateConstraintToml([], NO_LIMITS);
      // Should be just a trailing newline (the trimEnd + "\n")
      expect(result).toBe("\n");
    });

    it("ignores AI constraints (they are not serialized)", () => {
      const aiConstraint: Constraint = {
        id: "ai:suggested-lint",
        name: "AI suggested lint",
        description: "Auto-proposed",
        check: { type: "grep_forbidden", pattern: "TODO" },
        severity: "warn",
        enabled: true,
      };
      const result = generateConstraintToml([aiConstraint], NO_LIMITS);
      expect(result).toBe("\n");
    });

    it("ignores multiple AI constraints mixed with empty state", () => {
      const constraints: Constraint[] = [
        {
          id: "ai:first",
          name: "First AI",
          description: "",
          check: { type: "grep_forbidden", pattern: "x" },
          severity: "warn",
          enabled: true,
        },
        {
          id: "ai:second",
          name: "Second AI",
          description: "",
          check: { type: "grep_required", pattern: "y" },
          severity: "block",
          enabled: true,
        },
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).toBe("\n");
      expect(result).not.toContain("ai:");
    });
  });

  // ==========================================================================
  // Builtins Section
  // ==========================================================================

  describe("builtins section", () => {
    it("generates [builtins] with all enabled", () => {
      const constraints = [
        builtin("no-secrets"),
        builtin("no-debug-statements"),
        builtin("no-env-files"),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain("[builtins]");
      expect(result).toContain("no-secrets = true");
      expect(result).toContain("no-debug-statements = true");
      expect(result).toContain("no-env-files = true");
    });

    it("reflects disabled builtins as false", () => {
      const constraints = [
        builtin("no-secrets", true),
        builtin("no-debug-statements", false),
        builtin("no-env-files", true),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain("no-secrets = true");
      expect(result).toContain("no-debug-statements = false");
      expect(result).toContain("no-env-files = true");
    });

    it("omits [builtins] section when no builtins are present", () => {
      const constraints = [customGrepForbidden("no-todos", "TODO")];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).not.toContain("[builtins]");
    });

    it("generates single builtin correctly", () => {
      const constraints = [builtin("no-secrets", false)];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).toContain("[builtins]");
      expect(result).toContain("no-secrets = false");
    });
  });

  // ==========================================================================
  // Resource Limits Section
  // ==========================================================================

  describe("resources section", () => {
    it("generates [resources] with all fields set", () => {
      const limits: ResourceLimits = {
        maxWallTimeSecs: 300,
        maxFilesModified: 10,
        maxAgenticTimeMs: 60000,
        warningThreshold: 0.8,
      };
      const result = generateConstraintToml([], limits);

      expect(result).toContain("[resources]");
      expect(result).toContain("max_wall_time_secs = 300");
      expect(result).toContain("max_files_modified = 10");
      expect(result).toContain("max_agentic_time_ms = 60000");
      expect(result).toContain("warning_threshold = 0.8");
    });

    it("generates [resources] with partial fields", () => {
      const limits: ResourceLimits = {
        maxWallTimeSecs: 120,
      };
      const result = generateConstraintToml([], limits);

      expect(result).toContain("[resources]");
      expect(result).toContain("max_wall_time_secs = 120");
      expect(result).not.toContain("max_files_modified");
      expect(result).not.toContain("max_agentic_time_ms");
      expect(result).not.toContain("warning_threshold");
    });

    it("omits [resources] section when no limits are set", () => {
      const result = generateConstraintToml([], NO_LIMITS);
      expect(result).not.toContain("[resources]");
    });

    it("omits [resources] when all fields are undefined", () => {
      const limits: ResourceLimits = {
        maxWallTimeSecs: undefined,
        maxFilesModified: undefined,
        maxAgenticTimeMs: undefined,
        warningThreshold: undefined,
      };
      const result = generateConstraintToml([], limits);
      expect(result).not.toContain("[resources]");
    });

    it("includes zero values (not treated as unset)", () => {
      const limits: ResourceLimits = {
        maxWallTimeSecs: 0,
        maxFilesModified: 0,
      };
      const result = generateConstraintToml([], limits);

      expect(result).toContain("[resources]");
      expect(result).toContain("max_wall_time_secs = 0");
      expect(result).toContain("max_files_modified = 0");
    });

    it("renders warningThreshold with decimal value", () => {
      const limits: ResourceLimits = {
        warningThreshold: 0.75,
      };
      const result = generateConstraintToml([], limits);
      expect(result).toContain("warning_threshold = 0.75");
    });

    it("renders warningThreshold value of 1.0", () => {
      const limits: ResourceLimits = {
        warningThreshold: 1,
      };
      const result = generateConstraintToml([], limits);
      expect(result).toContain("warning_threshold = 1");
    });
  });

  // ==========================================================================
  // Custom Constraints — grep_forbidden
  // ==========================================================================

  describe("grep_forbidden constraint", () => {
    it("generates basic grep_forbidden", () => {
      const constraints = [customGrepForbidden("no-todos", "TODO")];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain("[[constraint]]");
      expect(result).toContain('id = "project:no-todos"');
      expect(result).toContain('name = "no todos"');
      expect(result).toContain('severity = "block"');
      expect(result).toContain("[constraint.check]");
      expect(result).toContain('type = "grep_forbidden"');
      expect(result).toContain('pattern = "TODO"');
    });

    it("includes file_glob when present", () => {
      const constraints = [
        customGrepForbidden("no-console", "console\\.log", {
          fileGlob: "*.ts",
        }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain('pattern = "console\\\\.log"');
      expect(result).toContain('file_glob = "*.ts"');
    });

    it("omits file_glob when absent", () => {
      const constraints = [customGrepForbidden("no-fixme", "FIXME")];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).not.toContain("file_glob");
    });
  });

  // ==========================================================================
  // Custom Constraints — grep_required
  // ==========================================================================

  describe("grep_required constraint", () => {
    it("generates grep_required with pattern", () => {
      const constraints = [customGrepRequired("has-license", "MIT License")];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain('type = "grep_required"');
      expect(result).toContain('pattern = "MIT License"');
    });

    it("includes file_glob when present", () => {
      const constraints = [
        customGrepRequired("has-header", "Copyright", { fileGlob: "*.py" }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain('type = "grep_required"');
      expect(result).toContain('file_glob = "*.py"');
    });
  });

  // ==========================================================================
  // Custom Constraints — file_scope
  // ==========================================================================

  describe("file_scope constraint", () => {
    it("generates file_scope with multiple allowed_paths", () => {
      const constraints = [customFileScope("scope-src", ["src/", "tests/"])];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain('type = "file_scope"');
      expect(result).toContain('allowed_paths = ["src/", "tests/"]');
    });

    it("generates single-element array correctly", () => {
      const constraints = [customFileScope("scope-lib", ["lib/"])];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain('allowed_paths = ["lib/"]');
    });
  });

  // ==========================================================================
  // Custom Constraints — command
  // ==========================================================================

  describe("command constraint", () => {
    it("generates command with default timeout (omits timeout_secs)", () => {
      const constraints = [customCommand("run-lint", "npm run lint")];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain('type = "command"');
      expect(result).toContain('cmd = "npm run lint"');
      // Default timeout should be omitted
      expect(result).not.toContain("timeout_secs");
    });

    it("includes cwd when present", () => {
      const constraints = [
        customCommand("run-tests", "cargo test", { cwd: "src-tauri" }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain('cmd = "cargo test"');
      expect(result).toContain('cwd = "src-tauri"');
    });

    it("omits cwd when absent", () => {
      const constraints = [customCommand("check-types", "tsc --noEmit")];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).not.toContain("cwd");
    });

    it("includes non-default timeout_secs", () => {
      const constraints = [
        customCommand("slow-test", "npm test", { timeoutSecs: 120 }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain("timeout_secs = 120");
    });
  });

  // ==========================================================================
  // Constraint Metadata
  // ==========================================================================

  describe("constraint metadata", () => {
    it("includes description when non-empty", () => {
      const constraints = [
        customGrepForbidden("no-todos", "TODO", {
          description: "Ensure no TODO comments are left in code",
        }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).toContain(
        'description = "Ensure no TODO comments are left in code"',
      );
    });

    it("omits description when empty", () => {
      const constraints = [
        customGrepForbidden("no-fixme", "FIXME", { description: "" }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).not.toContain("description");
    });

    it("includes enabled = false for disabled constraints", () => {
      const constraints = [
        customGrepForbidden("no-todos", "TODO", { enabled: false }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).toContain("enabled = false");
    });

    it("omits enabled field for enabled constraints (default is true)", () => {
      const constraints = [
        customGrepForbidden("no-todos", "TODO", { enabled: true }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      // "enabled = true" should NOT appear — only false is explicit
      expect(result).not.toMatch(/enabled = true/);
    });

    it("renders severity correctly for all levels", () => {
      const block = customGrepForbidden("s-block", "x", {
        severity: "block",
      });
      const warn = customGrepForbidden("s-warn", "x", { severity: "warn" });
      const log = customGrepForbidden("s-log", "x", { severity: "log" });

      expect(generateConstraintToml([block], NO_LIMITS)).toContain(
        'severity = "block"',
      );
      expect(generateConstraintToml([warn], NO_LIMITS)).toContain(
        'severity = "warn"',
      );
      expect(generateConstraintToml([log], NO_LIMITS)).toContain(
        'severity = "log"',
      );
    });
  });

  // ==========================================================================
  // Multiple Constraints
  // ==========================================================================

  describe("multiple custom constraints", () => {
    it("generates valid [[constraint]] array with two entries", () => {
      const constraints = [
        customGrepForbidden("no-todos", "TODO"),
        customGrepRequired("has-license", "MIT License"),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      // Count [[constraint]] headers
      const headers = result.match(/\[\[constraint\]\]/g);
      expect(headers).toHaveLength(2);

      // Both checks present
      expect(result).toContain('type = "grep_forbidden"');
      expect(result).toContain('type = "grep_required"');
    });

    it("preserves ordering of constraints", () => {
      const constraints = [
        customGrepForbidden("first", "AAA"),
        customCommand("second", "echo BBB"),
        customFileScope("third", ["src/"]),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      const firstIdx = result.indexOf('id = "project:first"');
      const secondIdx = result.indexOf('id = "project:second"');
      const thirdIdx = result.indexOf('id = "project:third"');

      expect(firstIdx).toBeLessThan(secondIdx);
      expect(secondIdx).toBeLessThan(thirdIdx);
    });
  });

  // ==========================================================================
  // TOML String Escaping (in generated output)
  // ==========================================================================

  describe("TOML string escaping", () => {
    it("escapes backslashes in patterns", () => {
      const constraints = [
        customGrepForbidden("no-windows-paths", "C:\\\\Users\\\\"),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      // The pattern string "C:\\Users\\" should be escaped to "C:\\\\Users\\\\"
      // in TOML: pattern = "C:\\\\Users\\\\"
      expect(result).toContain('pattern = "C:\\\\\\\\Users\\\\\\\\"');
    });

    it("escapes double quotes in strings", () => {
      const constraints = [customGrepForbidden("no-eval", 'eval("')];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      // Should escape the quote: pattern = "eval(\\""
      expect(result).toContain('pattern = "eval(\\""');
    });

    it("handles regex patterns with special chars", () => {
      const constraints = [
        customGrepForbidden("no-debugger", "debugger;?\\s*$"),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      // The backslash in \s should be escaped
      expect(result).toContain('pattern = "debugger;?\\\\s*$"');
    });

    it("escapes strings in allowed_paths array", () => {
      const constraints = [
        customFileScope("scope-special", [
          "path with spaces/",
          'path"with"quotes/',
        ]),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).toContain('"path with spaces/"');
      expect(result).toContain('"path\\"with\\"quotes/"');
    });

    it("escapes strings in command fields", () => {
      const constraints = [
        customCommand("echo-test", 'echo "hello world"', {
          cwd: "dir with spaces",
        }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).toContain('cmd = "echo \\"hello world\\""');
      expect(result).toContain('cwd = "dir with spaces"');
    });

    it("handles very long patterns", () => {
      const longPattern = "a".repeat(500);
      const constraints = [customGrepForbidden("long-pattern", longPattern)];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).toContain(`pattern = "${longPattern}"`);
    });
  });

  // ==========================================================================
  // AI Constraint Exclusion
  // ==========================================================================

  describe("AI constraint exclusion", () => {
    it("excludes ai: constraints but includes project: and builtin:", () => {
      const constraints: Constraint[] = [
        builtin("no-secrets"),
        {
          id: "ai:auto-lint",
          name: "Auto lint",
          description: "AI proposed",
          check: { type: "grep_forbidden", pattern: "lint-me" },
          severity: "warn",
          enabled: true,
        },
        customGrepForbidden("no-fixme", "FIXME"),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      expect(result).toContain("[builtins]");
      expect(result).toContain("no-secrets = true");
      expect(result).toContain('id = "project:no-fixme"');
      // AI constraint should NOT appear anywhere
      expect(result).not.toContain("ai:");
      expect(result).not.toContain("auto-lint");
      expect(result).not.toContain("lint-me");
    });

    it("only project: constraints appear in [[constraint]] sections", () => {
      const constraints: Constraint[] = [
        {
          id: "ai:ai-only",
          name: "AI only",
          description: "",
          check: { type: "grep_forbidden", pattern: "x" },
          severity: "warn",
          enabled: true,
        },
        customGrepForbidden("real-rule", "y"),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      const constraintHeaders = (
        result.match(/\[\[constraint\]\]/g) || []
      ).length;
      expect(constraintHeaders).toBe(1);
      expect(result).toContain('id = "project:real-rule"');
    });
  });

  // ==========================================================================
  // Full Config (builtins + custom + resources)
  // ==========================================================================

  describe("full config", () => {
    it("generates valid TOML with all sections", () => {
      const constraints: Constraint[] = [
        builtin("no-secrets"),
        builtin("no-debug-statements", false),
        customGrepForbidden("no-todos", "TODO", {
          description: "Remove all TODO comments",
          severity: "warn",
        }),
        customCommand("lint", "npm run lint", { timeoutSecs: 60 }),
      ];
      const limits: ResourceLimits = {
        maxWallTimeSecs: 300,
        maxFilesModified: 20,
        warningThreshold: 0.75,
      };

      const result = generateConstraintToml(constraints, limits);

      // Sections appear in correct order: builtins, resources, constraints
      const builtinsIdx = result.indexOf("[builtins]");
      const resourcesIdx = result.indexOf("[resources]");
      const firstConstraintIdx = result.indexOf("[[constraint]]");

      expect(builtinsIdx).toBeGreaterThanOrEqual(0);
      expect(resourcesIdx).toBeGreaterThan(builtinsIdx);
      expect(firstConstraintIdx).toBeGreaterThan(resourcesIdx);

      // Builtins
      expect(result).toContain("no-secrets = true");
      expect(result).toContain("no-debug-statements = false");

      // Resources
      expect(result).toContain("max_wall_time_secs = 300");
      expect(result).toContain("max_files_modified = 20");
      expect(result).toContain("warning_threshold = 0.75");
      expect(result).not.toContain("max_agentic_time_ms");

      // Custom constraints
      expect(result).toContain('id = "project:no-todos"');
      expect(result).toContain('severity = "warn"');
      expect(result).toContain(
        'description = "Remove all TODO comments"',
      );
      expect(result).toContain('id = "project:lint"');
      expect(result).toContain("timeout_secs = 60");
    });

    it("generates only builtins + resources (no custom constraints)", () => {
      const constraints = [builtin("no-secrets")];
      const limits: ResourceLimits = { maxWallTimeSecs: 60 };
      const result = generateConstraintToml(constraints, limits);

      expect(result).toContain("[builtins]");
      expect(result).toContain("[resources]");
      expect(result).not.toContain("[[constraint]]");
    });

    it("generates only resources + custom (no builtins)", () => {
      const constraints = [customGrepForbidden("rule", "x")];
      const limits: ResourceLimits = { maxFilesModified: 5 };
      const result = generateConstraintToml(constraints, limits);

      expect(result).not.toContain("[builtins]");
      expect(result).toContain("[resources]");
      expect(result).toContain("[[constraint]]");
    });
  });

  // ==========================================================================
  // Structural Correctness
  // ==========================================================================

  describe("structural correctness", () => {
    it("ends with a single newline", () => {
      const result = generateConstraintToml(
        [builtin("no-secrets"), customGrepForbidden("test", "x")],
        { maxWallTimeSecs: 60 },
      );
      expect(result).toMatch(/[^\n]\n$/);
    });

    it("does not produce consecutive blank lines in sections", () => {
      const result = generateConstraintToml(
        [
          builtin("no-secrets"),
          customGrepForbidden("a", "x"),
          customCommand("b", "echo ok"),
        ],
        { maxWallTimeSecs: 60 },
      );
      // No triple newlines (which would be two consecutive blank lines)
      expect(result).not.toContain("\n\n\n");
    });

    it("each [[constraint]] block has a [constraint.check] sub-table", () => {
      const constraints = [
        customGrepForbidden("a", "x"),
        customGrepRequired("b", "y"),
        customFileScope("c", ["src/"]),
        customCommand("d", "echo ok"),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      const constraintHeaders = (
        result.match(/\[\[constraint\]\]/g) || []
      ).length;
      const checkHeaders = (
        result.match(/\[constraint\.check\]/g) || []
      ).length;
      expect(constraintHeaders).toBe(4);
      expect(checkHeaders).toBe(constraintHeaders);
    });

    it("each check sub-table has a type field", () => {
      const constraints = [
        customGrepForbidden("a", "x"),
        customGrepRequired("b", "y"),
        customFileScope("c", ["src/"]),
        customCommand("d", "echo ok"),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);

      // Extract type values
      const typeMatches = result.match(/type = "(\w+)"/g) || [];
      expect(typeMatches).toHaveLength(4);
      expect(typeMatches).toContain('type = "grep_forbidden"');
      expect(typeMatches).toContain('type = "grep_required"');
      expect(typeMatches).toContain('type = "file_scope"');
      expect(typeMatches).toContain('type = "command"');
    });

    it("produces parseable TOML key-value pairs", () => {
      // Verify that each non-blank, non-header line is a valid key = value pair
      const result = generateConstraintToml(
        [builtin("no-secrets"), customGrepForbidden("test", "hello")],
        { maxWallTimeSecs: 60 },
      );

      const lines = result.split("\n").filter((l) => l.trim().length > 0);
      for (const line of lines) {
        // Line is either a TOML header or a key = value pair
        const isHeader = /^\[/.test(line);
        const isKeyValue = /^[a-z_-]+\s*=\s*.+/.test(line);
        expect(
          isHeader || isKeyValue,
          `Line is neither a header nor key=value: "${line}"`,
        ).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("edge cases", () => {
    it("constraint with empty description is omitted (not written as empty string)", () => {
      const constraints = [
        customGrepForbidden("test", "x", { description: "" }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).not.toContain("description");
    });

    it("disabled constraint includes enabled = false and all other fields", () => {
      const constraints = [
        customGrepForbidden("disabled-rule", "secret_key", {
          enabled: false,
          description: "Disabled for now",
          severity: "block",
          fileGlob: "*.env",
        }),
      ];
      const result = generateConstraintToml(constraints, NO_LIMITS);
      expect(result).toContain("enabled = false");
      expect(result).toContain('id = "project:disabled-rule"');
      expect(result).toContain('pattern = "secret_key"');
      expect(result).toContain('description = "Disabled for now"');
      expect(result).toContain('file_glob = "*.env"');
    });

    it("mixed builtins, AI, and project constraints are correctly filtered", () => {
      const constraints: Constraint[] = [
        builtin("no-secrets"),
        {
          id: "ai:ai-rule-1",
          name: "AI Rule 1",
          description: "",
          check: { type: "grep_forbidden", pattern: "ai-pattern" },
          severity: "warn",
          enabled: true,
        },
        customGrepForbidden("project-rule", "real-pattern"),
        {
          id: "ai:ai-rule-2",
          name: "AI Rule 2",
          description: "",
          check: { type: "grep_required", pattern: "ai-required" },
          severity: "block",
          enabled: true,
        },
        builtin("no-env-files", false),
      ];
      const result = generateConstraintToml(constraints, {
        maxWallTimeSecs: 100,
      });

      // Builtins present
      expect(result).toContain("no-secrets = true");
      expect(result).toContain("no-env-files = false");
      // Resources present
      expect(result).toContain("max_wall_time_secs = 100");
      // Only one [[constraint]] entry (the project one)
      const constraintHeaders = (
        result.match(/\[\[constraint\]\]/g) || []
      ).length;
      expect(constraintHeaders).toBe(1);
      expect(result).toContain('id = "project:project-rule"');
      // No AI content
      expect(result).not.toContain("ai-pattern");
      expect(result).not.toContain("ai-required");
      expect(result).not.toContain("ai:");
    });

    it("resource limits with zero values are included", () => {
      const limits: ResourceLimits = {
        maxWallTimeSecs: 0,
        maxFilesModified: 0,
        maxAgenticTimeMs: 0,
        warningThreshold: 0,
      };
      const result = generateConstraintToml([], limits);
      expect(result).toContain("[resources]");
      expect(result).toContain("max_wall_time_secs = 0");
      expect(result).toContain("max_files_modified = 0");
      expect(result).toContain("max_agentic_time_ms = 0");
      expect(result).toContain("warning_threshold = 0");
    });

    it("resource limits with null values are treated as unset", () => {
      // In TS, null != null is false, so null values should be omitted
      const limits: ResourceLimits = {
        maxWallTimeSecs: null as unknown as undefined,
      };
      const result = generateConstraintToml([], limits);
      // null is not == null in the != null check (null != null → false)
      // Actually null != null is false, so null IS treated as null
      // The check is `!= null`, and null != null is false, so null IS excluded
      expect(result).not.toContain("[resources]");
    });
  });
});
