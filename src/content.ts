import {
    buildMarkdownFilename,
    DEFAULT_EXPORT_DIRECTORY,
    EXPORT_DIRECTORY_STORAGE_KEY,
    sanitizeDirectoryPath,
    type ExportMode,
} from './export-config';
import {htmlToMarkdown} from './utils';

type StartSelectionMessage = {
    action: 'start-selection';
};

type DownloadMarkdownMessage = {
    action: 'download-markdown';
    markdown: string;
    filename: string;
    directory: string;
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
    exportDirectory: string;
    exportDirectoryInput: HTMLInputElement | null;
};

const state: SelectionState = {
    hoveredElement: null,
    lockedElement: null,
    selectionModeActive: false,
    highlightOverlay: null,
    controlsContainer: null,
    exportDirectory: DEFAULT_EXPORT_DIRECTORY,
    exportDirectoryInput: null,
};

function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(element.style, styles);
}

function generateFilename(mode: ExportMode): string {
    return buildMarkdownFilename(window.location.href, mode);
}

async function loadSavedExportDirectory(): Promise<void> {
    const saved = await browser.storage.local.get(EXPORT_DIRECTORY_STORAGE_KEY);
    state.exportDirectory = sanitizeDirectoryPath(
        typeof saved[EXPORT_DIRECTORY_STORAGE_KEY] === 'string'
            ? saved[EXPORT_DIRECTORY_STORAGE_KEY]
            : DEFAULT_EXPORT_DIRECTORY,
    );

    if (state.exportDirectoryInput) {
        state.exportDirectoryInput.value = state.exportDirectory;
    }
}

async function persistExportDirectory(rawPath: string): Promise<void> {
    const sanitizedDirectory = sanitizeDirectoryPath(rawPath);
    state.exportDirectory = sanitizedDirectory;

    if (state.exportDirectoryInput && state.exportDirectoryInput.value !== sanitizedDirectory) {
        state.exportDirectoryInput.value = sanitizedDirectory;
    }

    await browser.storage.local.set({
        [EXPORT_DIRECTORY_STORAGE_KEY]: sanitizedDirectory,
    });
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

function removeControls(): void {
    if (state.controlsContainer?.parentNode) {
        state.controlsContainer.parentNode.removeChild(state.controlsContainer);
    }

    state.controlsContainer = null;
    state.exportDirectoryInput = null;
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
    const payload: DownloadMarkdownMessage = {
        action: 'download-markdown',
        markdown,
        filename,
        directory: state.exportDirectory,
    };

    browser.runtime.sendMessage(payload);
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

function createControlsContainer(): HTMLDivElement {
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
    controls.style.flexDirection = 'column';
    controls.style.gap = '10px';
    controls.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    controls.style.minWidth = '320px';
    controls.style.maxWidth = 'min(90vw, 720px)';

    return controls;
}

function createDirectoryInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = state.exportDirectory;
    input.placeholder = 'Folder inside Downloads, e.g. notes/articles';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.inputMode = 'text';
    input.pattern = '^[^<>:\"|?*\\u0000-\\u001F]+(?:[/\\\\][^<>:\"|?*\\u0000-\\u001F]+)*$';
    input.style.padding = '8px 10px';
    input.style.color = '#1f2937';
    input.style.backgroundColor = '#ffffff';
    input.style.border = '1px solid #c9ced6';
    input.style.borderRadius = '4px';
    input.style.caretColor = '#1f2937';
    input.style.minWidth = '280px';
    input.style.outline = 'none';
    input.addEventListener('focus', () => {
        input.style.borderColor = '#0078D7';
        input.style.boxShadow = '0 0 0 3px rgba(0, 120, 215, 0.18)';
    });
    input.addEventListener('blur', () => {
        input.style.borderColor = '#c9ced6';
        input.style.boxShadow = 'none';
    });
    input.addEventListener('input', () => {
        void persistExportDirectory(input.value);
    });

    return input;
}

function exportFullPage(): void {
    const pageTitle = document.title || 'page';
    const clonedDocument = document.documentElement.cloneNode(true) as HTMLElement;
    const removableNodes = clonedDocument.querySelectorAll('script, style');
    removableNodes.forEach((node) => node.remove());

    const markdown = htmlToMarkdown(clonedDocument.outerHTML);
    downloadMarkdown(`# ${pageTitle}\n\n${markdown}`, generateFilename('FP'));
    stopSelectionMode();
}

function exportSelectedElement(): void {
    if (!state.lockedElement) {
        return;
    }

    const markdown = htmlToMarkdown(state.lockedElement.outerHTML);
    downloadMarkdown(markdown, generateFilename('SE'));
    stopSelectionMode();
}

function showControls(): void {
    if (state.controlsContainer) {
        return;
    }

    const controls = createControlsContainer();

    const title = document.createElement('div');
    title.textContent = 'Save as Markdown';
    title.style.fontWeight = 'bold';

    const directoryLabel = document.createElement('label');
    directoryLabel.textContent = 'Folder inside Firefox Downloads';
    directoryLabel.style.fontSize = '13px';
    directoryLabel.style.color = '#333';

    const directoryInput = createDirectoryInput();
    state.exportDirectoryInput = directoryInput;
    directoryInput.setAttribute('aria-label', 'Folder inside Firefox Downloads');

    const directoryHint = document.createElement('div');
    directoryHint.textContent = 'Saved between sessions. Only folder segments are kept.';
    directoryHint.style.fontSize = '12px';
    directoryHint.style.color = '#777';

    const actionsRow = document.createElement('div');
    actionsRow.style.display = 'flex';
    actionsRow.style.gap = '10px';
    actionsRow.style.alignItems = 'center';
    actionsRow.style.flexWrap = 'wrap';

    const fullPageButton = buildStyledButton('The whole page', '#0078D7');
    fullPageButton.addEventListener('click', exportFullPage);

    const selectedElementButton = buildStyledButton('Selected item', '#28a745');
    selectedElementButton.addEventListener('click', exportSelectedElement);

    const hint = document.createElement('div');
    hint.textContent = '(Esc to cancel)';
    hint.style.fontSize = '12px';
    hint.style.color = '#777';

    actionsRow.appendChild(fullPageButton);
    actionsRow.appendChild(selectedElementButton);
    actionsRow.appendChild(hint);

    controls.appendChild(title);
    controls.appendChild(directoryLabel);
    controls.appendChild(directoryInput);
    controls.appendChild(directoryHint);
    controls.appendChild(actionsRow);

    state.controlsContainer = controls;
    document.body.appendChild(controls);
}

export function startSelectionMode(): void {
    if (state.selectionModeActive) {
        return;
    }

    state.selectionModeActive = true;
    state.lockedElement = null;
    state.hoveredElement = null;

    createOverlay();
    void loadSavedExportDirectory();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
}

browser.runtime.onMessage.addListener((message: StartSelectionMessage) => {
    if (message.action === 'start-selection') {
        startSelectionMode();
    }
});
