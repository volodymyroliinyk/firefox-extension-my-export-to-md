const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const CONTENT_PATH = path.resolve(__dirname, '../.test-build/content.js');
const UTILS_PATH = path.resolve(__dirname, '../.test-build/utils.js');

class MockElement {
    constructor(tagName, ownerDocument) {
        this.tagName = tagName.toUpperCase();
        this.ownerDocument = ownerDocument;
        this.style = {};
        this.children = [];
        this.parentNode = null;
        this.textContent = '';
        this.eventListeners = new Map();
        this.outerHTML = `<${tagName}></${tagName}>`;
        this._rect = {top: 0, left: 0, width: 0, height: 0};
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index >= 0) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
        return child;
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    contains(node) {
        if (node === this) {
            return true;
        }

        for (const child of this.children) {
            if (child.contains(node)) {
                return true;
            }
        }

        return false;
    }

    addEventListener(type, listener) {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, []);
        }
        this.eventListeners.get(type).push(listener);
    }

    dispatchEvent(type, event = {}) {
        const listeners = this.eventListeners.get(type) || [];
        for (const listener of listeners) {
            listener(event);
        }
    }

    querySelectorAll() {
        return [];
    }

    cloneNode() {
        return this;
    }

    getBoundingClientRect() {
        return this._rect;
    }

    setBoundingClientRect(rect) {
        this._rect = rect;
    }
}

class MockDocument {
    constructor() {
        this.body = new MockElement('body', this);
        this.documentElement = new MockElement('html', this);
        this.documentElement.scrollTop = 0;
        this.documentElement.scrollLeft = 0;
        this.listeners = new Map();
        this._hovered = this.body;
        this.title = 'Demo Title';
        this._cloneResult = {
            outerHTML: '<html><body><main>demo</main></body></html>',
            querySelectorAll() {
                return [];
            }
        };
        this.documentElement.cloneNode = () => this._cloneResult;
    }

    createElement(tagName) {
        return new MockElement(tagName, this);
    }

    elementFromPoint() {
        return this._hovered;
    }

    setElementFromPoint(el) {
        this._hovered = el;
    }

    addEventListener(type, listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(listener);
    }

    removeEventListener(type, listener) {
        if (!this.listeners.has(type)) {
            return;
        }

        const items = this.listeners.get(type).filter((fn) => fn !== listener);
        this.listeners.set(type, items);
    }

    dispatch(type, event = {}) {
        for (const listener of this.listeners.get(type) || []) {
            listener(event);
        }
    }
}

function setupContentEnv() {
    const sentMessages = [];
    const messageListeners = [];

    const document = new MockDocument();
    const window = {
        location: {href: 'https://example.com/path?q=1'},
        pageYOffset: 5,
        pageXOffset: 7
    };

    const browser = {
        runtime: {
            sendMessage(payload) {
                sentMessages.push(payload);
            },
            onMessage: {
                addListener(listener) {
                    messageListeners.push(listener);
                }
            }
        }
    };

    require.cache[UTILS_PATH] = {
        id: UTILS_PATH,
        filename: UTILS_PATH,
        loaded: true,
        exports: {
            htmlToMarkdown(html) {
                return `MD:${html}`;
            }
        }
    };

    global.document = document;
    global.window = window;
    global.browser = browser;

    delete require.cache[CONTENT_PATH];
    const content = require(CONTENT_PATH);

    return {content, document, sentMessages, messageListeners};
}

function findOverlay(document) {
    return document.body.children.find((el) => el.style.zIndex === '999999');
}

function findControls(document) {
    return document.body.children.find((el) => el.style.zIndex === '1000000');
}

function createMouseEvent(target) {
    return {
        target,
        clientX: 20,
        clientY: 30,
        preventDefault() {
        },
        stopPropagation() {
        }
    };
}

test('startSelectionMode creates overlay and updates position on hover', () => {
    const env = setupContentEnv();
    const target = env.document.createElement('article');
    target.setBoundingClientRect({top: 10, left: 20, width: 30, height: 40});
    env.document.setElementFromPoint(target);

    env.content.startSelectionMode();

    const overlay = findOverlay(env.document);
    assert.ok(overlay);

    env.document.dispatch('mousemove', {clientX: 20, clientY: 30});

    assert.equal(overlay.style.top, '15px');
    assert.equal(overlay.style.left, '27px');
    assert.equal(overlay.style.width, '30px');
    assert.equal(overlay.style.height, '40px');
});

test('selected element export sends markdown message', () => {
    const env = setupContentEnv();
    const target = env.document.createElement('section');
    target.outerHTML = '<section><p>Hello</p></section>';
    target.setBoundingClientRect({top: 1, left: 2, width: 3, height: 4});
    env.document.setElementFromPoint(target);

    env.content.startSelectionMode();
    env.document.dispatch('mousemove', {clientX: 1, clientY: 1});
    env.document.dispatch('click', createMouseEvent(target));

    const controls = findControls(env.document);
    assert.ok(controls);

    const elementBtn = controls.children[2];
    elementBtn.dispatchEvent('click');

    assert.equal(env.sentMessages.length, 1);
    assert.equal(env.sentMessages[0].action, 'download-markdown');
    assert.equal(env.sentMessages[0].markdown, 'MD:<section><p>Hello</p></section>');
    assert.match(env.sentMessages[0].filename, /^example_com_path_q_1_\d{8}_\d{6}\.md$/);
});

test('full page export prepends title and converts cloned html', () => {
    const env = setupContentEnv();
    const target = env.document.createElement('main');
    target.outerHTML = '<main>Data</main>';
    target.setBoundingClientRect({top: 1, left: 2, width: 3, height: 4});
    env.document.setElementFromPoint(target);

    const removableA = {
        removeCalled: 0, remove() {
            this.removeCalled += 1;
        }
    };
    const removableB = {
        removeCalled: 0, remove() {
            this.removeCalled += 1;
        }
    };

    env.document._cloneResult = {
        outerHTML: '<html><body><script>x</script><style>y</style><main>Data</main></body></html>',
        querySelectorAll(selector) {
            assert.equal(selector, 'script, style');
            return [removableA, removableB];
        }
    };

    env.content.startSelectionMode();
    env.document.dispatch('mousemove', {clientX: 1, clientY: 1});
    env.document.dispatch('click', createMouseEvent(target));

    const controls = findControls(env.document);
    const fullPageBtn = controls.children[1];
    fullPageBtn.dispatchEvent('click');

    assert.equal(env.sentMessages.length, 1);
    assert.match(env.sentMessages[0].markdown, /^# Demo Title\n\nMD:/);
    assert.equal(removableA.removeCalled, 1);
    assert.equal(removableB.removeCalled, 1);
});

test('escape unlocks first, then fully stops selection mode', () => {
    const env = setupContentEnv();
    const target = env.document.createElement('div');
    target.setBoundingClientRect({top: 1, left: 2, width: 3, height: 4});
    env.document.setElementFromPoint(target);

    env.content.startSelectionMode();
    env.document.dispatch('mousemove', {clientX: 1, clientY: 1});
    env.document.dispatch('click', createMouseEvent(target));

    assert.ok(findOverlay(env.document));
    assert.ok(findControls(env.document));

    env.document.dispatch('keydown', {key: 'Escape'});
    assert.ok(findOverlay(env.document));
    assert.equal(findControls(env.document), undefined);

    env.document.dispatch('keydown', {key: 'Escape'});
    assert.equal(findOverlay(env.document), undefined);
});

test('runtime start-selection message starts selection mode', () => {
    const env = setupContentEnv();
    assert.equal(env.messageListeners.length, 1);

    env.messageListeners[0]({action: 'start-selection'});

    assert.ok(findOverlay(env.document));
});
