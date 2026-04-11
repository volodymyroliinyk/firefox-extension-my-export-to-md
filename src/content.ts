import {htmlToMarkdown} from './utils';

function generateFilename(): string {
    const url = window.location.href.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_');
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const ii = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}_${hh}${ii}${ss}`;
    return `${url}_${dateStr}.md`;
}

let hoveredElement: HTMLElement | null = null;
let lockedElement: HTMLElement | null = null;
let selectionModeActive = false;
let highlightOverlay: HTMLDivElement | null = null;
let controlsContainer: HTMLDivElement | null = null;

function createOverlay() {
    if (highlightOverlay) return;
    highlightOverlay = document.createElement('div');
    highlightOverlay.style.position = 'absolute';
    highlightOverlay.style.pointerEvents = 'none';
    highlightOverlay.style.zIndex = '999999';
    highlightOverlay.style.border = '3px solid #0078D7';
    highlightOverlay.style.backgroundColor = 'rgba(0, 120, 215, 0.1)';
    highlightOverlay.style.transition = 'all 0.1s ease-out';
    document.body.appendChild(highlightOverlay);
}

function updateOverlay(el: HTMLElement) {
    if (!highlightOverlay) return;
    const rect = el.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    highlightOverlay.style.top = `${rect.top + scrollTop}px`;
    highlightOverlay.style.left = `${rect.left + scrollLeft}px`;
    highlightOverlay.style.width = `${rect.width}px`;
    highlightOverlay.style.height = `${rect.height}px`;
}

function removeOverlay() {
    if (highlightOverlay && highlightOverlay.parentNode) {
        highlightOverlay.parentNode.removeChild(highlightOverlay);
        highlightOverlay = null;
    }
}

function handleMouseMove(e: MouseEvent) {
    if (!selectionModeActive || lockedElement) return;

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (!el || el === document.body || el === document.documentElement || (controlsContainer && controlsContainer.contains(el))) return;

    if (hoveredElement !== el) {
        hoveredElement = el;
        updateOverlay(el);
    }
}

function stopSelectionMode() {
    selectionModeActive = false;
    lockedElement = null;
    hoveredElement = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
    // Also remove keydown listener for Escape
    document.removeEventListener('keydown', handleKeyDown);
    removeOverlay();
    removeControls();
}

function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        if (lockedElement) {
            // unlock and go back to hover mode
            lockedElement = null;
            removeControls();
        } else {
            stopSelectionMode();
        }
    }
}

function handleClick(e: MouseEvent) {
    if (!selectionModeActive) return;

    // if clicking inside controls, let it happen
    const target = e.target as HTMLElement;
    if (controlsContainer && controlsContainer.contains(target)) return;

    e.preventDefault();
    e.stopPropagation();

    if (lockedElement) {
        // click outside unlocks
        lockedElement = null;
        removeControls();
    } else if (hoveredElement) {
        lockedElement = hoveredElement;
        updateOverlay(lockedElement);
        highlightOverlay!.style.border = '3px solid #28a745'; // target locked color
        highlightOverlay!.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        showControls();
    }
}

function downloadMarkdown(markdown: string, filename: string) {
    browser.runtime.sendMessage({
        action: 'download-markdown',
        markdown: markdown,
        filename: filename
    });
}

function showControls() {
    if (controlsContainer) return;

    controlsContainer = document.createElement('div');
    controlsContainer.style.position = 'fixed';
    controlsContainer.style.bottom = '20px';
    controlsContainer.style.left = '50%';
    controlsContainer.style.transform = 'translateX(-50%)';
    controlsContainer.style.zIndex = '1000000';
    controlsContainer.style.backgroundColor = 'white';
    controlsContainer.style.padding = '15px';
    controlsContainer.style.borderRadius = '8px';
    controlsContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.gap = '10px';
    controlsContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    const title = document.createElement('div');
    title.textContent = 'Зберегти як Markdown';
    title.style.fontWeight = 'bold';
    title.style.marginRight = '10px';
    title.style.alignSelf = 'center';
    controlsContainer.appendChild(title);

    const fullPageBtn = document.createElement('button');
    fullPageBtn.textContent = 'Вся сторінка';
    fullPageBtn.style.padding = '8px 16px';
    fullPageBtn.style.cursor = 'pointer';
    fullPageBtn.style.backgroundColor = '#0078D7';
    fullPageBtn.style.color = 'white';
    fullPageBtn.style.border = 'none';
    fullPageBtn.style.borderRadius = '4px';

    fullPageBtn.addEventListener('click', () => {
        const title = document.title || 'page';
        const clone = document.documentElement.cloneNode(true) as HTMLElement;
        const scripts = clone.querySelectorAll('script, style');
        scripts.forEach(s => s.remove());

        const markdown = htmlToMarkdown(document.body.outerHTML);
        downloadMarkdown(`# ${title}\n\n${markdown}`, generateFilename());
        stopSelectionMode();
    });

    const elementBtn = document.createElement('button');
    elementBtn.textContent = 'Вибраний елемент';
    elementBtn.style.padding = '8px 16px';
    elementBtn.style.cursor = 'pointer';
    elementBtn.style.backgroundColor = '#28a745';
    elementBtn.style.color = 'white';
    elementBtn.style.border = 'none';
    elementBtn.style.borderRadius = '4px';

    elementBtn.addEventListener('click', () => {
        if (lockedElement) {
            const htmlSnippet = lockedElement.outerHTML;
            const markdown = htmlToMarkdown(htmlSnippet);
            downloadMarkdown(markdown, generateFilename());
            stopSelectionMode();
        }
    });

    controlsContainer.appendChild(fullPageBtn);
    controlsContainer.appendChild(elementBtn);

    // add click outside listener note
    const hint = document.createElement('div');
    hint.textContent = '(Esc щоб скасувати)';
    hint.style.fontSize = '12px';
    hint.style.color = '#777';
    hint.style.alignSelf = 'center';
    hint.style.marginLeft = '10px';
    controlsContainer.appendChild(hint);

    document.body.appendChild(controlsContainer);
}

function removeControls() {
    if (controlsContainer && controlsContainer.parentNode) {
        controlsContainer.parentNode.removeChild(controlsContainer);
        controlsContainer = null;
    }
}

export function startSelectionMode() {
    if (selectionModeActive) return;
    selectionModeActive = true;
    lockedElement = null;
    hoveredElement = null;
    createOverlay();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
}

browser.runtime.onMessage.addListener((message) => {
    if (message.action === "start-selection") {
        startSelectionMode();
    }
});
