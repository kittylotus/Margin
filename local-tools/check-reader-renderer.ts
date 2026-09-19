import { html } from '../lib/export.ts';

const sample = `# Heading

Paragraph with **bold**, *italic*, ~~deleted~~, \`inline code\`, and [a link](https://example.com).

- first bullet
- [x] finished task

1. first step
2. second step

> A quoted **idea**.

| Left | Right |
|:---|---:|
| one | two |

\`\`\`ts
const value = '<safe>';
\`\`\`

---`;

const rendered = html(sample);
const expectations = [
  '<h1>Heading</h1>',
  '<strong>bold</strong>',
  '<em>italic</em>',
  '<del>deleted</del>',
  '<code>inline code</code>',
  '<a href="https://example.com"',
  '<ul>',
  '<input type="checkbox" disabled checked/>',
  '<ol>',
  '<blockquote>',
  '<table>',
  'class="language-ts"',
  '&lt;safe&gt;',
  '<hr/>',
];
for (const expected of expectations) {
  if (!rendered.includes(expected)) throw new Error(`Markdown renderer missing ${expected}`);
}
const unsafe = html('[bad](javascript:alert(1))');
if (unsafe.includes('href=')) throw new Error('Unsafe markdown link became clickable.');
console.log('✓ reader markdown fixtures');
