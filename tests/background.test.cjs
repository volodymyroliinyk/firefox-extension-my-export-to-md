const test = require('node:test');
const assert = require('node:assert/strict');

const BACKGROUND_PATH = require('node:path').resolve(__dirname, '../.test-build/background.js');

function createBackgroundEnv() {
    const clickListeners = [];
    const messageListeners = [];

    const calls = {
        sendMessage: [],
        executeScript: [],
        downloads: [],
        errors: []
    };

    const browser = {
        tabs: {
            async sendMessage(tabId, payload) {
                calls.sendMessage.push({tabId, payload});
                return {ok: true};
            },
            async executeScript(tabId, payload) {
                calls.executeScript.push({tabId, payload});
            }
        },
        browserAction: {
            onClicked: {
                addListener(listener) {
                    clickListeners.push(listener);
                }
            }
        },
        runtime: {
            onMessage: {
                addListener(listener) {
                    messageListeners.push(listener);
                }
            }
        },
        downloads: {
            async download(payload) {
                calls.downloads.push(payload);
            }
        }
    };

    return {browser, clickListeners, messageListeners, calls};
}

function loadBackground(browser) {
    global.browser = browser;
    delete require.cache[BACKGROUND_PATH];
    require(BACKGROUND_PATH);
}

async function flush() {
    await new Promise((resolve) => setImmediate(resolve));
}

test('background starts selection directly when content script already injected', async () => {
    const env = createBackgroundEnv();
    loadBackground(env.browser);

    assert.equal(env.clickListeners.length, 1);
    env.clickListeners[0]({id: 12});
    await flush();

    assert.deepEqual(env.calls.sendMessage, [
        {tabId: 12, payload: {action: 'start-selection'}}
    ]);
    assert.equal(env.calls.executeScript.length, 0);
});

test('background injects content script when first sendMessage fails', async () => {
    const env = createBackgroundEnv();
    let attempt = 0;
    env.browser.tabs.sendMessage = async (tabId, payload) => {
        env.calls.sendMessage.push({tabId, payload});
        attempt += 1;
        if (attempt === 1) {
            throw new Error('not injected yet');
        }
    };

    loadBackground(env.browser);

    env.clickListeners[0]({id: 4});
    await flush();

    assert.equal(env.calls.sendMessage.length, 2);
    assert.deepEqual(env.calls.executeScript, [
        {tabId: 4, payload: {file: 'dist/content.js'}}
    ]);
});

test('background ignores clicks without tab id', async () => {
    const env = createBackgroundEnv();
    loadBackground(env.browser);

    env.clickListeners[0]({});
    await flush();

    assert.equal(env.calls.sendMessage.length, 0);
    assert.equal(env.calls.executeScript.length, 0);
});

test('download-markdown revokes object URL after successful download', async () => {
    const env = createBackgroundEnv();
    const revoked = [];
    global.URL = {
        createObjectURL() {
            return 'blob:ok';
        },
        revokeObjectURL(url) {
            revoked.push(url);
        }
    };

    loadBackground(env.browser);

    assert.equal(env.messageListeners.length, 1);
    env.messageListeners[0]({
        action: 'download-markdown',
        markdown: '# Hi',
        filename: 'hi.md'
    });

    await flush();

    assert.equal(env.calls.downloads.length, 1);
    assert.equal(env.calls.downloads[0].url, 'blob:ok');
    assert.equal(env.calls.downloads[0].filename, 'hi.md');
    assert.equal(env.calls.downloads[0].saveAs, true);
    assert.deepEqual(revoked, ['blob:ok']);
});

test('download-markdown revokes object URL when download fails', async () => {
    const env = createBackgroundEnv();
    const revoked = [];

    env.browser.downloads.download = async () => {
        throw new Error('failed');
    };

    global.URL = {
        createObjectURL() {
            return 'blob:err';
        },
        revokeObjectURL(url) {
            revoked.push(url);
        }
    };

    const originalError = console.error;
    console.error = () => {
    };

    try {
        loadBackground(env.browser);
        env.messageListeners[0]({
            action: 'download-markdown',
            markdown: '# Fail',
            filename: 'fail.md'
        });
        await flush();
    } finally {
        console.error = originalError;
    }

    assert.deepEqual(revoked, ['blob:err']);
});
