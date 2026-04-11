async function ensureContentScriptAndStartSelection(tabId: number): Promise<void> {
    try {
        await browser.tabs.sendMessage(tabId, {action: "start-selection"});
        return;
    } catch {
        // Content script is likely not injected in this tab yet.
    }

    await browser.tabs.executeScript(tabId, {file: "dist/content.js"});
    await browser.tabs.sendMessage(tabId, {action: "start-selection"});
}

browser.browserAction.onClicked.addListener((tab) => {
    if (!tab.id) {
        return;
    }

    ensureContentScriptAndStartSelection(tab.id).catch((error) => {
        // Restricted pages (about:, addons.mozilla.org, etc.) can reject script injection.
        console.error("Cannot start selection mode on this tab:", error);
    });
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download-markdown") {

        // Convert string to a Blob
        const blob = new Blob([message.markdown], {type: 'text/markdown'});
        const url = URL.createObjectURL(blob);

        browser.downloads.download({
            url: url,
            filename: message.filename,
            saveAs: true // Let user pick location/filename
        }).then(() => {
            URL.revokeObjectURL(url);
        }).catch(err => {
            console.error("Download failed:", err);
            URL.revokeObjectURL(url);
        });
    }
});
