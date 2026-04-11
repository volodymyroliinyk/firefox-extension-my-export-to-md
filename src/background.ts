type StartSelectionMessage = {
    action: 'start-selection';
};

type DownloadMarkdownMessage = {
    action: 'download-markdown';
    markdown: string;
    filename: string;
};

type RuntimeMessage = StartSelectionMessage | DownloadMarkdownMessage;

const CONTENT_SCRIPT_FILE = 'dist/content.js';

function isDownloadMarkdownMessage(message: unknown): message is DownloadMarkdownMessage {
    if (!message || typeof message !== 'object') {
        return false;
    }

    const candidate = message as Partial<DownloadMarkdownMessage>;
    return (
        candidate.action === 'download-markdown'
        && typeof candidate.markdown === 'string'
        && typeof candidate.filename === 'string'
    );
}

async function ensureContentScriptAndStartSelection(tabId: number): Promise<void> {
    try {
        await browser.tabs.sendMessage(tabId, {action: 'start-selection'});
        return;
    } catch {
        // Content script is likely not injected in this tab yet.
    }

    await browser.tabs.executeScript(tabId, {file: CONTENT_SCRIPT_FILE});
    await browser.tabs.sendMessage(tabId, {action: 'start-selection'});
}

async function handleDownloadMarkdown(message: DownloadMarkdownMessage): Promise<void> {
    const blob = new Blob([message.markdown], {type: 'text/markdown'});
    const blobUrl = URL.createObjectURL(blob);

    try {
        await browser.downloads.download({
            url: blobUrl,
            filename: message.filename,
            saveAs: true,
        });
    } catch (error) {
        console.error('Download failed:', error);
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

browser.browserAction.onClicked.addListener((tab) => {
    if (!tab.id) {
        return;
    }

    ensureContentScriptAndStartSelection(tab.id).catch((error) => {
        // Restricted pages (about:, addons.mozilla.org, etc.) can reject script injection.
        console.error('Cannot start selection mode on this tab:', error);
    });
});

browser.runtime.onMessage.addListener((message: RuntimeMessage) => {
    if (!isDownloadMarkdownMessage(message)) {
        return;
    }

    void handleDownloadMarkdown(message);
});
