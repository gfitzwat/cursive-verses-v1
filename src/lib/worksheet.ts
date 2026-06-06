import {
	buildHandwritingPath,
	annotationCommandsToSvgPathData,
	compileFormationAnnotations,
	type HandwritingStyle,
	type WritingPath
} from 'letterpaths';

export type WorksheetStyle = HandwritingStyle;

export type RenderedLine = {
	svgPath: string;
	annotationPaths: string[];
	width: number;
	height: number;
	baseline: number;
	xHeight: number;
};

const LINE_HEIGHT = 120;
const X_HEIGHT = 60;
const BASELINE = 90;

export function renderLine(text: string, style: WorksheetStyle): RenderedLine | null {
	// letterpaths only supports a-z; strip unsupported chars but keep spaces
	const safe = text
		.toLowerCase()
		.replace(/[^a-z ]/g, '')
		.trim();
	if (!safe) return null;

	let path: WritingPath;
	try {
		path = buildHandwritingPath(safe, {
			style,
			targetGuides: { xHeight: X_HEIGHT, baseline: BASELINE }
		});
	} catch {
		return null;
	}

	const svgPath = path.curves
		.map((c, i) => {
			const prefix = i === 0 ? `M ${c.p0.x},${c.p0.y}` : '';
			return `${prefix} C ${c.p1.x},${c.p1.y} ${c.p2.x},${c.p2.y} ${c.p3.x},${c.p3.y}`;
		})
		.join(' ');

	const annotations = compileFormationAnnotations(path, {});
	const annotationPaths = annotations.map((a) => annotationCommandsToSvgPathData(a.commands));

	const xs = path.curves.flatMap((c) => [c.p0.x, c.p1.x, c.p2.x, c.p3.x]);
	const width = Math.max(...xs) + 20;

	return { svgPath, annotationPaths, width, height: LINE_HEIGHT, baseline: BASELINE, xHeight: X_HEIGHT };
}

export function chunkWords(text: string, charsPerLine = 30): string[] {
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
