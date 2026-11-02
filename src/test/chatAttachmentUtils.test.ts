import { describe, expect, it } from 'vitest';
import { encodeChatAttachment, parseChatAttachment } from '@/components/chat/chatAttachmentUtils';

describe('chat attachment message format', () => {
  it('round-trips paths and unicode filenames', () => {
    const attachment = {
      path: 'conversation-id/attachment-id.png',
      name: 'অর্ডারের ছবি 📦.png',
      type: 'image/png',
    };

    expect(parseChatAttachment(encodeChatAttachment(attachment))).toEqual(attachment);
  });

  it('rejects ordinary messages and malformed attachment payloads', () => {
    expect(parseChatAttachment('A regular chat message')).toBeNull();
    expect(parseChatAttachment('[[shopland-attachment:not-json]]')).toBeNull();
  });
});
