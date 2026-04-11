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
