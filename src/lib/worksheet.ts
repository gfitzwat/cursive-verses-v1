export type WorksheetStyle = 'print' | 'cursive';

export const FONT_SIZE = 72;
export const LINE_HEIGHT = 130;
export const BASELINE = 95;        // y of baseline within each line block
export const CAP_HEIGHT = BASELINE - FONT_SIZE * 0.68;
export const X_HEIGHT = BASELINE - FONT_SIZE * 0.48;
export const DESCENDER = BASELINE + FONT_SIZE * 0.25;

export function chunkWords(text: string, charsPerLine = 18): string[] {
	const words = text.split(' ');
	const lines: string[] = [];
	let current = '';
	for (const word of words) {
		if (current.length + word.length + 1 > charsPerLine && current) {
			lines.push(current.trim());
			current = word + ' ';
		} else {
			current += word + ' ';
		}
	}
	if (current.trim()) lines.push(current.trim());
	return lines;
}
