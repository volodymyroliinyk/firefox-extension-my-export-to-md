browser.browserAction.onClicked.addListener((tab) => {
    if (tab.id) {
        // Send a message to the active tab to start the selection process
        browser.tabs.sendMessage(tab.id, {action: "start-selection"}).catch(error => {
            console.error("Error sending message to content script:", error);
            // It's possible the content script isn't loaded yet on this tab, or it's a restricted page.
        });
    }
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
