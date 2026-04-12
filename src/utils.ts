import TurndownService from 'turndown';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
});

function escapeTableCell(cellContent: string): string {
    return cellContent
        .replace(/\|/g, '\\|')
        .replace(/\r?\n+/g, '<br>')
        .trim();
}

type ExtractedRow = {
    cells: string[];
    hasHeaderCell: boolean;
};

type PendingRowSpan = {
    rowsLeft: number;
};

function parseSpanValue(rawValue: string | null): number {
    const numericValue = Number.parseInt(rawValue ?? '1', 10);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
}

function fillPendingSpans(row: string[], pendingSpans: Map<number, PendingRowSpan>, fromColumn: number): number {
    let columnIndex = fromColumn;

    while (pendingSpans.has(columnIndex)) {
        row[columnIndex] = '';
        const span = pendingSpans.get(columnIndex)!;
        span.rowsLeft -= 1;

        if (span.rowsLeft <= 0) {
            pendingSpans.delete(columnIndex);
        } else {
            pendingSpans.set(columnIndex, span);
        }

        columnIndex += 1;
    }

    return columnIndex;
}

function extractRows(table: HTMLTableElement): ExtractedRow[] {
    const allRows = Array.from(table.querySelectorAll('tr'));
    const pendingSpans = new Map<number, PendingRowSpan>();

    return allRows
        .map((row) => {
            const markdownRow: string[] = [];
            let columnIndex = 0;

            columnIndex = fillPendingSpans(markdownRow, pendingSpans, columnIndex);

            const cellElements = Array.from(row.children)
                .filter((element): element is HTMLTableCellElement => {
                    return element.tagName === 'TH' || element.tagName === 'TD';
                });

            for (const cell of cellElements) {
                columnIndex = fillPendingSpans(markdownRow, pendingSpans, columnIndex);

                const cellValue = escapeTableCell(cell.textContent ?? '');
                const colspan = parseSpanValue(cell.getAttribute('colspan'));
                const rowspan = parseSpanValue(cell.getAttribute('rowspan'));

                markdownRow[columnIndex] = cellValue;

                for (let offset = 1; offset < colspan; offset += 1) {
                    markdownRow[columnIndex + offset] = '';
                }

                if (rowspan > 1) {
                    for (let offset = 0; offset < colspan; offset += 1) {
                        pendingSpans.set(columnIndex + offset, {rowsLeft: rowspan - 1});
                    }
                }

                columnIndex += colspan;
            }

            fillPendingSpans(markdownRow, pendingSpans, columnIndex);

            return {
                cells: markdownRow,
                hasHeaderCell: cellElements.some((cell) => cell.tagName === 'TH'),
            };
        })
        .filter((row) => row.cells.length > 0);
}

function toMarkdownTable(table: HTMLTableElement): string {
    const rows = extractRows(table);
    if (rows.length === 0) {
        return '';
    }

    const maxColumns = rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
    const normalizedRows = rows.map((row) => {
        const copy = row.cells.slice();
        while (copy.length < maxColumns) {
            copy.push('');
        }
        return copy;
    });

    const firstHeaderRowIndex = rows.findIndex((row) => row.hasHeaderCell);
    const headerRowIndex = firstHeaderRowIndex >= 0 ? firstHeaderRowIndex : 0;

    const headerRow = normalizedRows[headerRowIndex] ?? normalizedRows[0];
    if (!headerRow) {
        return '';
    }
    const bodyRows = normalizedRows.filter((_, index) => index !== headerRowIndex);

    const headerLine = `| ${headerRow.join(' | ')} |`;
    const separatorLine = `| ${Array(maxColumns).fill('---').join(' | ')} |`;
    const bodyLines = bodyRows.map((row) => `| ${row.join(' | ')} |`);

    return `\n\n${[headerLine, separatorLine, ...bodyLines].join('\n')}\n\n`;
}

turndownService.addRule('table', {
    filter: 'table',
    replacement: (_content, node) => {
        const table = node as HTMLTableElement;
        return toMarkdownTable(table);
    },
});

export function htmlToMarkdown(htmlString: string): string {
    return turndownService.turndown(htmlString);
}
