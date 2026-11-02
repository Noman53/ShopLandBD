const ATTACHMENT_PREFIX = '[[shopland-attachment:';

export interface ChatAttachmentData {
  path: string;
  name: string;
  type: string;
}

export function encodeChatAttachment(attachment: ChatAttachmentData) {
  return `${ATTACHMENT_PREFIX}${encodeURIComponent(JSON.stringify(attachment))}]]`;
}

export function parseChatAttachment(content: string): ChatAttachmentData | null {
  if (!content.startsWith(ATTACHMENT_PREFIX) || !content.endsWith(']]')) return null;
  try {
    const parsed: unknown = JSON.parse(
      decodeURIComponent(content.slice(ATTACHMENT_PREFIX.length, -2))
    );
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('path' in parsed) ||
      !('name' in parsed) ||
      !('type' in parsed) ||
      typeof parsed.path !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.type !== 'string'
    ) return null;
    return { path: parsed.path, name: parsed.name, type: parsed.type };
  } catch {
    return null;
  }
}
