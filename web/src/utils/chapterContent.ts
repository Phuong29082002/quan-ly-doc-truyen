// PB43: nội dung chương gồm đoạn văn và ảnh minh họa.
// Ảnh được chèn trên một dòng riêng theo cú pháp ![mô tả](đường dẫn ảnh) – Web và Android dùng chung quy ước này.

export type ContentBlock = { type: "text"; text: string } | { type: "image"; url: string; alt: string };

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

export function parseChapterContent(content: string): ContentBlock[] {
  return content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): ContentBlock => {
      const m = IMAGE_LINE.exec(line);
      return m ? { type: "image", alt: m[1], url: m[2] } : { type: "text", text: line };
    });
}

export function imageMarkup(url: string, alt: string): string {
  return `![${alt.replace(/[[\]]/g, "")}](${url})`;
}
