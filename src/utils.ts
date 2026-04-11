import TurndownService from 'turndown';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
});

export function htmlToMarkdown(htmlString: string): string {
    return turndownService.turndown(htmlString);
}
