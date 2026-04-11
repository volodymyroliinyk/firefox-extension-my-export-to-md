import TurndownService from 'turndown';

export function htmlToMarkdown(htmlString: string): string {
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
    });
    return turndownService.turndown(htmlString);
}
