export type HtmlNode =
  | { type: "text"; value: string }
  | { type: "element"; tag: string; attrs: Record<string, string>; children: HtmlNode[] };

const SELF_CLOSING = new Set(["br", "hr", "img", "input"]);

function parseAttrs(tagContent: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let match;
  while ((match = attrRegex.exec(tagContent)) !== null) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[2]);
  }
  return attrs;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function findMatchingEndTag(html: string, tag: string): number {
  const openTagRegex = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "gi");
  const closeTagRegex = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 1;
  let pos = 0;

  while (pos < html.length) {
    openTagRegex.lastIndex = 0;
    closeTagRegex.lastIndex = 0;
    const slice = html.slice(pos);
    const openMatch = openTagRegex.exec(slice);
    const closeMatch = closeTagRegex.exec(slice);

    const openIndex = openMatch ? openMatch.index : -1;
    const closeIndex = closeMatch ? closeMatch.index : -1;

    if (closeIndex === -1) return -1;
    if (openIndex === -1 || closeIndex < openIndex) {
      depth--;
      if (depth === 0) return pos + closeIndex;
      pos += closeIndex + (closeMatch?.[0]?.length ?? 0);
    } else {
      depth++;
      pos += openIndex + (openMatch?.[0]?.length ?? 0);
    }
  }
  return -1;
}

export function parseHtml(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  let i = 0;

  while (i < html.length) {
    const ltIndex = html.indexOf("<", i);
    if (ltIndex === -1) {
      const text = decodeHtmlEntities(html.slice(i));
      if (text) nodes.push({ type: "text", value: text });
      break;
    }

    if (ltIndex > i) {
      const text = decodeHtmlEntities(html.slice(i, ltIndex));
      if (text) nodes.push({ type: "text", value: text });
    }

    const gtIndex = html.indexOf(">", ltIndex);
    if (gtIndex === -1) break;

    const tagContent = html.slice(ltIndex + 1, gtIndex);
    const tagMatch = tagContent.match(/^(\w+)/);
    if (!tagMatch) {
      i = ltIndex + 1;
      continue;
    }

    const tag = tagMatch[1].toLowerCase();
    i = gtIndex + 1;

    if (tag.startsWith("/")) continue;

    if (SELF_CLOSING.has(tag)) {
      nodes.push({ type: "element", tag, attrs: parseAttrs(tagContent), children: [] });
      continue;
    }

    const endIndex = findMatchingEndTag(html.slice(i), tag);
    if (endIndex === -1) {
      const text = decodeHtmlEntities(html.slice(i));
      if (text) nodes.push({ type: "text", value: text });
      break;
    }

    const innerHtml = html.slice(i, i + endIndex);
    const children = parseHtml(innerHtml);
    nodes.push({ type: "element", tag, attrs: parseAttrs(tagContent), children });
    const closeTag = `</${tag}>`;
    i += endIndex + closeTag.length;
  }

  return nodes;
}
