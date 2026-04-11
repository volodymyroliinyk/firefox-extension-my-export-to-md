import {htmlToMarkdown} from './utils';

type StartSelectionMessage = {
    action: 'start-selection';
};

const OVERLAY_Z_INDEX = '999999';
const CONTROLS_Z_INDEX = '1000000';

const overlayStyles = {
    base: {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: OVERLAY_Z_INDEX,
        transition: 'all 0.1s ease-out',
    },
    hover: {
        border: '3px solid #0078D7',
        backgroundColor: 'rgba(0, 120, 215, 0.1)',
    },
    locked: {
        border: '3px solid #28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
    },
} as const;

type SelectionState = {
    hoveredElement: HTMLElement | null;
    lockedElement: HTMLElement | null;
    selectionModeActive: boolean;
    highlightOverlay: HTMLDivElement | null;
    controlsContainer: HTMLDivElement | null;
};

const state: SelectionState = {
    hoveredElement: null,
    lockedElement: null,
    selectionModeActive: false,
    highlightOverlay: null,
    controlsContainer: null,
};

function generateFilename(): string {
    const sanitizedUrl = window.location.href
        .replace(/^https?:\/\//, '')
        .replace(/[^a-zA-Z0-9]/g, '_');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const ii = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    return `${sanitizedUrl}_${yyyy}${mm}${dd}_${hh}${ii}${ss}.md`;
}

function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(element.style, styles);
}

function setOverlayHoverStyles(): void {
    if (!state.highlightOverlay) {
        return;
    }

    applyStyles(state.highlightOverlay, overlayStyles.hover);
}

function setOverlayLockedStyles(): void {
    if (!state.highlightOverlay) {
        return;
    }

    applyStyles(state.highlightOverlay, overlayStyles.locked);
}

function createOverlay(): void {
    if (state.highlightOverlay) {
        return;
    }

    const overlay = document.createElement('div');
    applyStyles(overlay, overlayStyles.base);
    state.highlightOverlay = overlay;
    setOverlayHoverStyles();
    document.body.appendChild(overlay);
}

function updateOverlay(element: HTMLElement): void {
    if (!state.highlightOverlay) {
        return;
    }

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    state.highlightOverlay.style.top = `${rect.top + scrollTop}px`;
    state.highlightOverlay.style.left = `${rect.left + scrollLeft}px`;
    state.highlightOverlay.style.width = `${rect.width}px`;
    state.highlightOverlay.style.height = `${rect.height}px`;
}

function removeOverlay(): void {
    if (state.highlightOverlay?.parentNode) {
        state.highlightOverlay.parentNode.removeChild(state.highlightOverlay);
    }
    state.highlightOverlay = null;
}

function resetLockedState(): void {
    state.lockedElement = null;
    setOverlayHoverStyles();
    removeControls();
}

function isIgnoredTarget(element: HTMLElement | null): boolean {
    if (!element) {
        return true;
    }

    return (
        element === document.body
        || element === document.documentElement
        || (state.controlsContainer ? state.controlsContainer.contains(element) : false)
    );
}

function handleMouseMove(event: MouseEvent): void {
    if (!state.selectionModeActive || state.lockedElement) {
        return;
    }

    const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    if (isIgnoredTarget(element)) {
        return;
    }

    if (state.hoveredElement !== element && element) {
        state.hoveredElement = element;
        updateOverlay(element);
    }
}

function stopSelectionMode(): void {
    state.selectionModeActive = false;
    state.lockedElement = null;
    state.hoveredElement = null;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown);

    removeOverlay();
    removeControls();
}

function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
        return;
    }

    if (state.lockedElement) {
        resetLockedState();
        return;
    }

    stopSelectionMode();
}

function handleClick(event: MouseEvent): void {
    if (!state.selectionModeActive) {
        return;
    }

    const target = event.target as HTMLElement;
    if (state.controlsContainer?.contains(target)) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (state.lockedElement) {
        resetLockedState();
        return;
    }

    if (!state.hoveredElement) {
        return;
    }

    state.lockedElement = state.hoveredElement;
    updateOverlay(state.lockedElement);
    setOverlayLockedStyles();
    showControls();
}

function downloadMarkdown(markdown: string, filename: string): void {
    browser.runtime.sendMessage({
        action: 'download-markdown',
        markdown,
        filename,
    });
}

function buildStyledButton(text: string, backgroundColor: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.padding = '8px 16px';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = backgroundColor;
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    return button;
}

function showControls(): void {
    if (state.controlsContainer) {
        return;
    }

    const controls = document.createElement('div');
    controls.style.position = 'fixed';
    controls.style.bottom = '20px';
    controls.style.left = '50%';
    controls.style.transform = 'translateX(-50%)';
    controls.style.zIndex = CONTROLS_Z_INDEX;
    controls.style.backgroundColor = 'white';
    controls.style.padding = '15px';
    controls.style.borderRadius = '8px';
    controls.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    controls.style.display = 'flex';
    controls.style.gap = '10px';
    controls.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    const title = document.createElement('div');
    title.textContent = 'Save as Markdown';
    title.style.fontWeight = 'bold';
    title.style.marginRight = '10px';
    title.style.alignSelf = 'center';

    const fullPageButton = buildStyledButton('The whole page', '#0078D7');
    fullPageButton.addEventListener('click', () => {
        const pageTitle = document.title || 'page';
        const clonedDocument = document.documentElement.cloneNode(true) as HTMLElement;
        const removableNodes = clonedDocument.querySelectorAll('script, style');
        removableNodes.forEach((node) => node.remove());

        const markdown = htmlToMarkdown(clonedDocument.outerHTML);
        downloadMarkdown(`# ${pageTitle}\n\n${markdown}`, generateFilename());
        stopSelectionMode();
    });

    const selectedElementButton = buildStyledButton('Selected item', '#28a745');
    selectedElementButton.addEventListener('click', () => {
        if (!state.lockedElement) {
            return;
        }

        const markdown = htmlToMarkdown(state.lockedElement.outerHTML);
        downloadMarkdown(markdown, generateFilename());
        stopSelectionMode();
    });

    const hint = document.createElement('div');
    hint.textContent = '(Esc to cancel)';
    hint.style.fontSize = '12px';
    hint.style.color = '#777';
    hint.style.alignSelf = 'center';
    hint.style.marginLeft = '10px';

    controls.appendChild(title);
    controls.appendChild(fullPageButton);
    controls.appendChild(selectedElementButton);
    controls.appendChild(hint);

    state.controlsContainer = controls;
    document.body.appendChild(controls);
}

function removeControls(): void {
    if (state.controlsContainer?.parentNode) {
        state.controlsContainer.parentNode.removeChild(state.controlsContainer);
    }

    state.controlsContainer = null;
}

export function startSelectionMode(): void {
    if (state.selectionModeActive) {
        return;
    }

    state.selectionModeActive = true;
    state.lockedElement = null;
    state.hoveredElement = null;

    createOverlay();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
}

browser.runtime.onMessage.addListener((message: StartSelectionMessage) => {
    if (message.action === 'start-selection') {
        startSelectionMode();
    }
});
