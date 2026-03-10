import type { AiMessage } from "@qontinui/shared-types";

/**
 * Parse an output_log string into AiMessage array.
 *
 * Supports two formats:
 * 1. **Tagged format** (post-persistence): [USER_MESSAGE] and [AI_RESPONSE] blocks
 * 2. **Legacy format**: [USER_MESSAGE] blocks with plain AI text between them
 *
 * Also handles [SESSION_START:N] markers (stripped).
 */
export function parseOutputLog(outputLog: string): AiMessage[] {
  // Detect if output_log uses [AI_RESPONSE] blocks (new persisted format)
  const hasAiResponseBlocks = outputLog.includes("[AI_RESPONSE]");

  if (hasAiResponseBlocks) {
    return parseTaggedFormat(outputLog);
  }

  return parseLegacyFormat(outputLog);
}

/**
 * Parse output_log that uses both [USER_MESSAGE] and [AI_RESPONSE] blocks.
 *
 * Also handles **mixed format** where early AI responses are untagged (plain text
 * between user messages) and later ones are tagged with [AI_RESPONSE]. This happens
 * when a session started before the persistence feature and was resumed after.
 */
function parseTaggedFormat(outputLog: string): AiMessage[] {
  const messages: AiMessage[] = [];

  // Match all recognized blocks in order: USER_MESSAGE, AI_RESPONSE, CHAT_RESUMED, SYSTEM_NOTE
  const blockRegex =
    /\[(USER_MESSAGE|AI_RESPONSE|CHAT_RESUMED|SYSTEM_NOTE)\]\n?([\s\S]*?)\n?\[\/(USER_MESSAGE|AI_RESPONSE|CHAT_RESUMED|SYSTEM_NOTE)\]/g;

  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(outputLog)) !== null) {
    // Check for untagged AI text between the last block and this one
    const gap = outputLog
      .slice(lastIndex, match.index)
      .replace(/\[SESSION_START:\d+\]/g, "")
      .trim();
    if (gap) {
      messages.push({ role: "ai", content: gap });
    }

    const tag = match[1];
    const content = (match[2] ?? "").trim();
    lastIndex = match.index + match[0].length;

    if (!content) continue;

    if (tag === "USER_MESSAGE") {
      messages.push({ role: "user", content });
    } else if (tag === "AI_RESPONSE") {
      messages.push({ role: "ai", content });
    } else if (tag === "SYSTEM_NOTE") {
      messages.push({ role: "system", content });
    }
    // CHAT_RESUMED blocks are silently skipped
  }

  // Check for trailing untagged AI text
  const trailing = outputLog
    .slice(lastIndex)
    .replace(/\[SESSION_START:\d+\]/g, "")
    .trim();
  if (trailing) {
    messages.push({ role: "ai", content: trailing });
  }

  return messages;
}

/**
 * Parse output_log using the legacy format (USER_MESSAGE blocks + plain AI text).
 */
function parseLegacyFormat(outputLog: string): AiMessage[] {
  const messages: AiMessage[] = [];
  const userMsgRegex = /\[USER_MESSAGE\]\n?([\s\S]*?)\n?\[\/USER_MESSAGE\]/g;

  let lastIndex = 0;
  let match;

  while ((match = userMsgRegex.exec(outputLog)) !== null) {
    // AI content before this user message
    const aiContent = outputLog
      .slice(lastIndex, match.index)
      .replace(/\[SESSION_START:\d+\]/g, "")
      .trim();
    if (aiContent) {
      messages.push({ role: "ai", content: aiContent });
    }

    // User message
    const userContent = (match[1] ?? "").trim();
    if (userContent) {
      messages.push({ role: "user", content: userContent });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining AI content after last user message
  const remaining = outputLog
    .slice(lastIndex)
    .replace(/\[SESSION_START:\d+\]/g, "")
    .trim();
  if (remaining) {
    messages.push({ role: "ai", content: remaining });
  }

  return messages;
}

/**
 * Auto-generate a session name from the first user message.
 * Truncates to maxLength and adds ellipsis if needed.
 */
export function autoNameFromMessage(
  content: string,
  maxLength: number = 40,
): string {
  const trimmed = content.trim().replace(/\n/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 1) + "…";
}
