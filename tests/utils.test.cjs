const test = require('node:test');
const assert = require('node:assert/strict');

const {htmlToMarkdown} = require('../.test-build/utils.js');

test('htmlToMarkdown converts headings with ATX style', () => {
    const md = htmlToMarkdown('<h2>Section</h2>');
    assert.equal(md.trim(), '## Section');
});

test('htmlToMarkdown uses fenced code blocks', () => {
    const md = htmlToMarkdown('<pre><code class="language-js">const a = 1;</code></pre>');
    assert.match(md, /```js\nconst a = 1;\n```/);
});

test('htmlToMarkdown uses dash bullets and hr marker', () => {
    const md = htmlToMarkdown('<ul><li>One</li><li>Two</li></ul><hr>');
    assert.match(md, /-   One/);
    assert.match(md, /-   Two/);
    assert.match(md, /\n---$/);
});

test('htmlToMarkdown converts HTML table with thead to Markdown table', () => {
    const html = '<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Ada</td><td>31</td></tr></tbody></table>';
    const md = htmlToMarkdown(html);

    assert.match(md, /\| Name \| Age \|/);
    assert.match(md, /\| --- \| --- \|/);
    assert.match(md, /\| Ada \| 31 \|/);
});

test('htmlToMarkdown converts HTML table without thead using first row as header', () => {
    const html = '<table><tr><td>Lang</td><td>Level</td></tr><tr><td>TS</td><td>Advanced</td></tr></table>';
    const md = htmlToMarkdown(html);

    assert.match(md, /\| Lang \| Level \|/);
    assert.match(md, /\| --- \| --- \|/);
    assert.match(md, /\| TS \| Advanced \|/);
});

test('htmlToMarkdown expands colspan cells into a valid Markdown grid', () => {
    const html = '<table><tr><th>Product</th><th colspan="2">Q1</th></tr><tr><td>Book</td><td>10</td><td>12</td></tr></table>';
    const md = htmlToMarkdown(html);

    assert.match(md, /\| Product \| Q1 \|  \|/);
    assert.match(md, /\| --- \| --- \| --- \|/);
    assert.match(md, /\| Book \| 10 \| 12 \|/);
});

test('htmlToMarkdown expands rowspan cells into a valid Markdown grid', () => {
    const html = '<table><tr><th>Group</th><th>Item</th></tr><tr><td rowspan="2">A</td><td>One</td></tr><tr><td>Two</td></tr></table>';
    const md = htmlToMarkdown(html);

    assert.match(md, /\| Group \| Item \|/);
    assert.match(md, /\| A \| One \|/);
    assert.match(md, /\|  \| Two \|/);
});
