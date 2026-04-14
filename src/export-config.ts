export const EXPORT_DIRECTORY_STORAGE_KEY = 'exportDirectory';

export const DEFAULT_EXPORT_DIRECTORY = '';

export type ExportMode = 'FP' | 'SE';

function sanitizeToken(value: string): string {
    const normalized = value
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    return normalized || 'page';
}

export function normalizeUrlForFilename(rawUrl: string): string {
    try {
        const url = new URL(rawUrl);
        const normalized = `${url.host}${url.pathname}${url.search}`;
        return sanitizeToken(normalized);
    } catch {
        return sanitizeToken(rawUrl.replace(/^https?:\/\//, ''));
    }
}

export function formatTimestamp(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const ii = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    return `${yyyy}${mm}${dd}_${hh}${ii}${ss}`;
}

export function buildMarkdownFilename(rawUrl: string, mode: ExportMode, date: Date = new Date()): string {
    return `${normalizeUrlForFilename(rawUrl)}_${mode}_${formatTimestamp(date)}.md`;
}

function sanitizePathSegment(segment: string): string {
    return segment
        .replace(/[<>:"|?*\u0000-\u001f]/g, '')
        .trim();
}

export function sanitizeDirectoryPath(rawPath: string): string {
    return rawPath
        .split(/[\\/]+/)
        .map((segment) => sanitizePathSegment(segment))
        .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
        .join('/');
}

export function buildDownloadPath(directory: string, filename: string): string {
    const sanitizedDirectory = sanitizeDirectoryPath(directory);
    return sanitizedDirectory ? `${sanitizedDirectory}/${filename}` : filename;
}
