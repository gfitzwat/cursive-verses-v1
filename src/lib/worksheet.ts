export type WorksheetStyle = "cursive";

export const FONT_SIZE = 44;
export const LINE_HEIGHT = 82;
export const BASELINE = 60;
export const CAP_HEIGHT = BASELINE - FONT_SIZE * 0.68;
export const X_HEIGHT = BASELINE - FONT_SIZE * 0.48;
export const DESCENDER = BASELINE + FONT_SIZE * 0.25;

/**
 * Wrap text into lines that fit within maxWidth pixels at the given font/size.
 * Uses canvas measureText for accuracy when running in the browser.
 * Falls back to a character-count estimate during SSR.
 */
export function wrapText(
	text: string,
	fontFamily: string,
	fontSize: number,
	maxWidth: number,
	wordSpacingEm: number = 0
): string[] {
	// SSR fallback — canvas not available
	if (typeof document === "undefined") {
		return chunkWords(text, Math.floor(maxWidth / (fontSize * 0.48)));
	}

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d")!;
	ctx.font = `${fontSize}px ${fontFamily}`;

	// Extra units added per word gap (wordSpacingEm is relative to fontSize)
	const wordSpacingPx = wordSpacingEm * fontSize;

	const words = text.split(" ");
	const lines: string[] = [];
	let current = "";

	for (const word of words) {
		const test = current ? `${current} ${word}` : word;
		const gaps = test.split(" ").length - 1;
		const effectiveWidth = ctx.measureText(test).width + wordSpacingPx * gaps;
		if (effectiveWidth > maxWidth && current) {
			lines.push(current);
			current = word;
		} else {
			current = test;
		}
	}
	if (current) lines.push(current);
	return lines;
}

/** Character-count fallback used during SSR */
export function chunkWords(text: string, charsPerLine = 45): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		if (current.length + word.length + 1 > charsPerLine && current) {
			lines.push(current.trim());
			current = word + " ";
		} else {
			current += word + " ";
		}
	}
	if (current.trim()) lines.push(current.trim());
	return lines;
}
