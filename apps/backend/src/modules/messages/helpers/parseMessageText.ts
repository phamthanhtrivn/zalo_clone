type MessageContent = {
  text?: string;
};

export function parseMessageText(content: unknown): string {
  if (!content) return '';

  let parsed: MessageContent;

  if (typeof content === 'string') {
    parsed = JSON.parse(content) as MessageContent;
  } else if (typeof content === 'object') {
    parsed = content as MessageContent;
  } else {
    return '';
  }

  return parsed.text ?? '';
}
