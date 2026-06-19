<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { PageData } from './$types';
	import { verseRef, cleanText, TRANSLATIONS, type BibleVerse } from '$lib/bible';
	import { wrapText, FONT_SIZE, LINE_HEIGHT, BASELINE, CAP_HEIGHT, X_HEIGHT, DESCENDER } from '$lib/worksheet';

	let { data }: { data: PageData } = $props();

	let selectedBookId = $state<number | null>(null);
	let selectedChapter = $state<number | null>(null);
	let selectedVerse = $state<BibleVerse | null>(null);
	let mode = $state<'tracing' | 'copywork'>('tracing');
	let printSection = $state<HTMLElement | null>(null);
	let printRenderKey = $state(0);

	// 0 = nothing, 1 = book, 2 = chapter, 3 = verse
	let selectionProgress = $derived(
		selectedVerse ? 3 : selectedChapter !== null ? 2 : selectedBookId !== null ? 1 : 0
	);

	type RGB = [number, number, number];
	const GRAY: RGB    = [148, 163, 184]; // slate-400
	const INDIGO: RGB  = [79,  70,  229]; // indigo-600
	const EMERALD: RGB = [5,  150,  105]; // emerald-600

	let printBaselineTone = $state(50);
	let printDescenderTone = $state(100);
	let printXHeightTone = $state(100);
	let printCapHeightTone = $state(100);
	let printTracingTone = $state(90);
	let printFontScale = $state(136);
	let linesPerPageSetting = $state(13);
	let wordSpacing = $state(0);

	function lerpRgb(from: RGB, to: RGB, t: number): RGB {
		return [
			Math.round(from[0] + (to[0] - from[0]) * t),
			Math.round(from[1] + (to[1] - from[1]) * t),
			Math.round(from[2] + (to[2] - from[2]) * t),
		];
	}

	function hexToRgb(hex: string): RGB {
		const clean = hex.replace('#', '');
		return [
			Number.parseInt(clean.slice(0, 2), 16),
			Number.parseInt(clean.slice(2, 4), 16),
			Number.parseInt(clean.slice(4, 6), 16)
		];
	}

	function rgbToHex(rgb: RGB): string {
		return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
	}

	function toneToHex(lightHex: string, darkHex: string, tone: number): string {
		const t = Math.max(0, Math.min(1, tone / 100));
		return rgbToHex(lerpRgb(hexToRgb(lightHex), hexToRgb(darkHex), t));
	}

	function toneToOpacity(tone: number, min = 0.35, max = 1): number {
		const t = Math.max(0, Math.min(1, tone / 100));
		return min + (max - min) * t;
	}

	function relativeLuminance(rgb: RGB): number {
		return rgb.reduce((acc: number, c: number, i: number) => {
			const s = c / 255;
			const lin = s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			return acc + lin * ([0.2126, 0.7152, 0.0722][i]);
		}, 0);
	}

	function wcagTextColor(bg: RGB): string {
		const bgL = relativeLuminance(bg);
		// contrast against white vs slate-900 (#1e293b ≈ luminance 0.021)
		const whiteContrast = 1.05 / (bgL + 0.05);
		return whiteContrast >= 4.5 ? '#ffffff' : '#1e293b';
	}

	function buttonStyle(target: RGB): string {
		const t = selectionProgress / 3;
		const bg = lerpRgb(GRAY, target, t);
		const color = wcagTextColor(bg);
		return `background-color:rgb(${bg.join(',')});color:${color};transition:background-color 0.4s ease,color 0.3s ease;`;
	}

	const BASELINE_LIGHT = '#94a3b8';
	const BASELINE_DARK = '#334155';
	const DESCENDER_LIGHT = '#e2e8f0';
	const DESCENDER_DARK = '#94a3b8';
	const XHEIGHT_LIGHT = '#cbd5e1';
	const XHEIGHT_DARK = '#64748b';
	const CAPHEIGHT_LIGHT = '#cbd5e1';
	const CAPHEIGHT_DARK = '#64748b';
	const TRACING_LIGHT = '#94a3b8';
	const TRACING_DARK = '#334155';

	let printBaselineColor = $derived(toneToHex(BASELINE_LIGHT, BASELINE_DARK, printBaselineTone));
	let printBaselineOpacity = $derived(toneToOpacity(printBaselineTone));
	let printDescenderColor = $derived(toneToHex(DESCENDER_LIGHT, DESCENDER_DARK, printDescenderTone));
	let printXHeightColor = $derived(toneToHex(XHEIGHT_LIGHT, XHEIGHT_DARK, printXHeightTone));
	let printCapHeightColor = $derived(toneToHex(CAPHEIGHT_LIGHT, CAPHEIGHT_DARK, printCapHeightTone));
	let printTracingColor = $derived(toneToHex(TRACING_LIGHT, TRACING_DARK, printTracingTone));

	let worksheetFontSize = $derived(Math.round(FONT_SIZE * (printFontScale / 100)));
	let worksheetLineHeight = $derived(Math.round(LINE_HEIGHT * (worksheetFontSize / FONT_SIZE)));
	let worksheetBaseline = $derived(Math.round(BASELINE * (worksheetFontSize / FONT_SIZE)));
	let worksheetCapHeight = $derived(Math.round(CAP_HEIGHT * (worksheetFontSize / FONT_SIZE)));
	let worksheetXHeight = $derived(Math.round(X_HEIGHT * (worksheetFontSize / FONT_SIZE)));
	let worksheetDescender = $derived(Math.round(DESCENDER * (worksheetFontSize / FONT_SIZE)));

	// A letter page fits about 13 ruled lines with the current margins.
	// Fill the rest with blank practice lines after the verse.
	let defaultPageHeight = $derived(linesPerPageSetting * LINE_HEIGHT);
	let pageLines = $derived(Math.max(4, Math.floor(defaultPageHeight / worksheetLineHeight)));

	// When translation changes, re-find the same verse in the new translation.
	// Use untrack() to read selectedVerse without making it a dependency of this
	// effect — otherwise writing selectedVerse would re-trigger the effect.
	$effect(() => {
		const _t = data.translation; // only track translation changes
		const current = untrack(() => selectedVerse);
		if (current !== null) {
			selectedVerse = data.verses.find(
				(v) => v.book === current.book &&
					   v.chapter === current.chapter &&
					   v.verse === current.verse
			) ?? null;
		}
	});

	let chapters = $derived(
		selectedBookId === null
			? []
			: [...new Set(data.verses.filter((v) => v.book === selectedBookId).map((v) => v.chapter))].sort((a, b) => a - b)
	);

	let chapterVerses = $derived(
		selectedBookId === null || selectedChapter === null
			? []
			: data.verses.filter((v) => v.book === selectedBookId && v.chapter === selectedChapter)
	);

	const SVG_WIDTH = 1000;
	const FONT_FAMILY = "'LearningCurve', cursive";
	const FONT_FAMILY_DASHED = "'LearningCurveDashed', cursive";

	// Strip quotes for canvas font spec (canvas needs: 44px LearningCurve, not 'LearningCurve')
	const canvasFont = FONT_FAMILY.replace(/'/g, '');
	let lines = $derived(
		selectedVerse
			? wrapText(cleanText(selectedVerse.text), canvasFont, worksheetFontSize, SVG_WIDTH - 16, wordSpacing)
			: []
	);
	let blankLines = $derived(Math.max(2, pageLines - lines.length));

	function onBookChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		selectedBookId = val ? Number(val) : null;
		selectedChapter = null;
		selectedVerse = null;
	}

	function onChapterChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		selectedChapter = val ? Number(val) : null;
		selectedVerse = null;
	}

	function onVerseChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		if (!val) { selectedVerse = null; return; }
		const [ch, vs] = val.split(':').map(Number);
		selectedVerse = data.verses.find(
			(v) => v.book === selectedBookId && v.chapter === ch && v.verse === vs
		) ?? null;
	}

	function resetPrintTones() {
		printBaselineTone = 50;
		printDescenderTone = 100;
		printXHeightTone = 100;
		printCapHeightTone = 100;
		printTracingTone = 90;
		printFontScale = 136;
		linesPerPageSetting = 13;
		wordSpacing = 0;
	}

	async function printWorksheet() {
		if (!selectedVerse) return;
		printRenderKey += 1;
		await tick();
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		window.print();
	}
</script>

<svelte:head>
	<title>Cursive Verses — Bible Worksheet Maker</title>
</svelte:head>

<div class="no-print min-h-screen bg-slate-50 p-4">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-slate-800">Cursive Verses</h1>
		<p class="text-slate-500 text-sm">Create handwriting worksheets from Bible verses</p>
	</header>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<!-- Left: Selectors + Options -->
		<div class="md:col-span-1 space-y-3">
			<div class="bg-white rounded-xl shadow-sm p-4 space-y-3">
				<h2 class="font-semibold text-slate-700">Select a Verse</h2>

				<!-- Translation -->
				<div>
					<p class="text-xs text-slate-500 block mb-1">Translation</p>
					<div class="flex gap-2 flex-wrap">
						{#each TRANSLATIONS as t}
							<a
								href="?t={t.id}"
								class="px-2 py-1 rounded text-xs font-medium border {data.translation === t.id
									? 'bg-indigo-600 text-white border-indigo-600'
									: 'border-slate-300 text-slate-600 hover:border-indigo-400'}"
							>{t.id.toUpperCase()}</a>
						{/each}
					</div>
				</div>

				<!-- Book -->
				<div>
					<label for="book-select" class="text-xs text-slate-500 block mb-1">Book</label>
					<select id="book-select" onchange={onBookChange} value={selectedBookId ?? ''}
						class="w-full border border-slate-300 rounded-lg px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
						<option value="">— Select a book —</option>
						{#each data.books as book}
							<option value={book.id}>{book.name}</option>
						{/each}
					</select>
				</div>

				<!-- Chapter & Verse -->
				<div class="flex gap-3">
					<div class="flex-1">
						<label for="chapter-select" class="text-xs text-slate-500 block mb-1">Chapter</label>
						<select id="chapter-select" onchange={onChapterChange} disabled={chapters.length === 0} value={selectedChapter ?? ''}
							class="w-full border border-slate-300 rounded-lg px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-40">
							<option value="">— Select a chapter —</option>
							{#each chapters as ch}
								<option value={ch}>Chapter {ch}</option>
							{/each}
						</select>
					</div>

					<div class="flex-1">
						<label for="verse-select" class="text-xs text-slate-500 block mb-1">Verse</label>
						<select id="verse-select" onchange={onVerseChange} disabled={chapterVerses.length === 0}
							value={selectedVerse ? `${selectedVerse.chapter}:${selectedVerse.verse}` : ''}
							class="w-full border border-slate-300 rounded-lg px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-40">
							<option value="">— Select a verse —</option>
							{#each chapterVerses as v}
								<option value="{v.chapter}:{v.verse}">{v.verse}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<!-- Options -->
			<div class="bg-white rounded-xl shadow-sm p-4 space-y-3">
				<h2 class="font-semibold text-slate-700">Options</h2>

				<div>
					<p class="text-xs text-slate-500 block mb-1">Worksheet Mode</p>
					<div class="flex gap-2">
						<button onclick={() => (mode = 'tracing')}
							class="px-3 py-1 rounded-full text-xs font-medium border {mode === 'tracing'
								? 'bg-indigo-600 text-white border-indigo-600'
								: 'border-slate-300 text-slate-600 hover:border-indigo-400'}">Tracing</button>
						<button onclick={() => (mode = 'copywork')}
							class="px-3 py-1 rounded-full text-xs font-medium border {mode === 'copywork'
								? 'bg-indigo-600 text-white border-indigo-600'
								: 'border-slate-300 text-slate-600 hover:border-indigo-400'}">Copywork</button>
					</div>
				</div>

				<details class="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
					<summary class="cursor-pointer text-sm font-semibold text-slate-700">Advanced Print Settings</summary>
					<p class="mt-2 text-xs text-slate-500">Tune line and tracing darkness from light to dark for your printer.</p>

					<div class="mt-3 space-y-3">
						<div>
							<div class="flex items-center justify-between text-xs text-slate-600 mb-1">
								<span>Lines Per Page</span>
								<span>{pageLines} lines (target {linesPerPageSetting})</span>
							</div>
							<input type="range" min="10" max="18" value={linesPerPageSetting} oninput={(e) => (linesPerPageSetting = (e.currentTarget as HTMLInputElement).valueAsNumber)} class="w-full" />
						</div>

						<div>
							<div class="flex items-center justify-between text-xs text-slate-600 mb-1">
								<span>Worksheet Font Size</span>
								<span>{worksheetFontSize}px ({printFontScale}%)</span>
							</div>
							<input type="range" min="100" max="170" value={printFontScale} oninput={(e) => (printFontScale = (e.currentTarget as HTMLInputElement).valueAsNumber)} class="w-full" />
						</div>

						<div>
							<div class="flex items-center justify-between text-xs text-slate-600 mb-1">
								<span>Baseline (solid)</span>
								<span class="inline-flex items-center gap-2"><span class="inline-block h-3 w-3 rounded border border-slate-300" style={`background:${printBaselineColor}`}></span>{printBaselineTone}% ({printBaselineColor})</span>
							</div>
							<input type="range" min="0" max="100" value={printBaselineTone} oninput={(e) => (printBaselineTone = (e.currentTarget as HTMLInputElement).valueAsNumber)} class="w-full" />
						</div>

						<div>
							<div class="flex items-center justify-between text-xs text-slate-600 mb-1">
								<span>Descender (solid)</span>
								<span class="inline-flex items-center gap-2"><span class="inline-block h-3 w-3 rounded border border-slate-300" style={`background:${printDescenderColor}`}></span>{printDescenderTone}% ({printDescenderColor})</span>
							</div>
							<input type="range" min="0" max="100" value={printDescenderTone} oninput={(e) => (printDescenderTone = (e.currentTarget as HTMLInputElement).valueAsNumber)} class="w-full" />
						</div>

						<div>
							<div class="flex items-center justify-between text-xs text-slate-600 mb-1">
								<span>X-height (dashed)</span>
								<span class="inline-flex items-center gap-2"><span class="inline-block h-3 w-3 rounded border border-slate-300" style={`background:${printXHeightColor}`}></span>{printXHeightTone}% ({printXHeightColor})</span>
							</div>
							<input type="range" min="0" max="100" value={printXHeightTone} oninput={(e) => (printXHeightTone = (e.currentTarget as HTMLInputElement).valueAsNumber)} class="w-full" />
						</div>

						<div>
							<div class="flex items-center justify-between text-xs text-slate-600 mb-1">
								<span>Cap-height (dashed)</span>
								<span class="inline-flex items-center gap-2"><span class="inline-block h-3 w-3 rounded border border-slate-300" style={`background:${printCapHeightColor}`}></span>{printCapHeightTone}% ({printCapHeightColor})</span>
							</div>
							<input type="range" min="0" max="100" value={printCapHeightTone} oninput={(e) => (printCapHeightTone = (e.currentTarget as HTMLInputElement).valueAsNumber)} class="w-full" />
						</div>

						<div>
							<div class="flex items-center justify-between text-xs text-slate-600 mb-1">
								<span>Worksheet Text Fill</span>
								<span class="inline-flex items-center gap-2"><span class="inline-block h-3 w-3 rounded border border-slate-300" style={`background:${printTracingColor}`}></span>{printTracingTone}% ({printTracingColor})</span>
							</div>
							<input type="range" min="0" max="100" value={printTracingTone} oninput={(e) => (printTracingTone = (e.currentTarget as HTMLInputElement).valueAsNumber)} class="w-full" />
						</div>
					</div>

					<div>
						<div class="flex items-center justify-between text-xs text-slate-600 mb-1">
							<span>Word Spacing</span>
							<span class="font-mono">{wordSpacing.toFixed(2)}em</span>
						</div>
						<input type="range" min="0" max="1.5" step="0.05" value={wordSpacing} oninput={(e) => (wordSpacing = (e.currentTarget as HTMLInputElement).valueAsNumber)} class="w-full" />
					</div>

					<button
						type="button"
						onclick={resetPrintTones}
						class="mt-3 text-xs font-medium text-slate-600 hover:text-slate-800"
					>
						Reset defaults
					</button>
				</details>


				<button
					onclick={printWorksheet}
					disabled={!selectedVerse}
					style={buttonStyle(INDIGO)}
					class="w-full text-sm font-semibold py-2 rounded-lg disabled:cursor-not-allowed">
					Print Worksheet
				</button>
			</div>
		</div>

		<!-- Right: Preview -->
		<div class="md:col-span-2 space-y-3">
			<!-- Verse text card -->
			<div class="bg-white rounded-xl shadow-sm p-4">
				{#if !selectedVerse}
					<p class="text-slate-400 text-sm text-center py-4">Select a book, chapter, and verse</p>
				{:else}
					<blockquote class="border-l-4 border-indigo-300 pl-4">
						<p class="text-slate-800 text-base leading-relaxed">{cleanText(selectedVerse.text)}</p>
						<footer class="mt-2 text-xs text-indigo-600 font-semibold">
							{verseRef(selectedVerse)} &mdash; {data.translation.toUpperCase()}
						</footer>
					</blockquote>
				{/if}
			</div>

			<!-- Worksheet preview card -->
			<div class="bg-white rounded-xl shadow-sm p-4 min-h-64">
				{#if !selectedVerse}
					<p class="text-slate-400 text-sm text-center py-8">Worksheet will appear here</p>
				{:else}
					<p class="text-xs text-slate-400 mb-3 text-center">{mode}</p>
					<!-- All verse lines grouped -->
					{#each lines as line}
						<svg viewBox="0 0 {SVG_WIDTH} {worksheetLineHeight}" width="100%" xmlns="http://www.w3.org/2000/svg" overflow="visible" class="block">
							<line x1="0" y1={worksheetDescender} x2={SVG_WIDTH} y2={worksheetDescender} stroke={printDescenderColor} stroke-width="1"/>
							<line x1="0" y1={worksheetBaseline} x2={SVG_WIDTH} y2={worksheetBaseline} stroke={printBaselineColor} stroke-opacity={printBaselineOpacity} stroke-width="1"/>
							<line x1="0" y1={worksheetXHeight} x2={SVG_WIDTH} y2={worksheetXHeight} stroke={printXHeightColor} stroke-width="0.75" stroke-dasharray="4,4"/>
							<line x1="0" y1={worksheetCapHeight} x2={SVG_WIDTH} y2={worksheetCapHeight} stroke={printCapHeightColor} stroke-width="0.75" stroke-dasharray="2,6"/>
							{#if mode === 'tracing'}
								<text x="8" y={worksheetBaseline} font-family={FONT_FAMILY_DASHED} font-size={worksheetFontSize} fill={printTracingColor} word-spacing="{wordSpacing}em">{line}</text>
							{:else}
								<text x="8" y={worksheetBaseline} font-family={FONT_FAMILY} font-size={worksheetFontSize} fill={printTracingColor} word-spacing="{wordSpacing}em">{line}</text>
							{/if}
						</svg>
					{/each}

					<!-- Blank practice lines filling the rest of the page -->
					{#each Array(blankLines) as _}
						<svg viewBox="0 0 {SVG_WIDTH} {worksheetLineHeight}" width="100%" xmlns="http://www.w3.org/2000/svg" overflow="visible" class="block">
							<line x1="0" y1={worksheetDescender} x2={SVG_WIDTH} y2={worksheetDescender} stroke={printDescenderColor} stroke-width="1"/>
							<line x1="0" y1={worksheetBaseline} x2={SVG_WIDTH} y2={worksheetBaseline} stroke={printBaselineColor} stroke-opacity={printBaselineOpacity} stroke-width="1"/>
							<line x1="0" y1={worksheetXHeight} x2={SVG_WIDTH} y2={worksheetXHeight} stroke={printXHeightColor} stroke-width="0.75" stroke-dasharray="4,4"/>
							<line x1="0" y1={worksheetCapHeight} x2={SVG_WIDTH} y2={worksheetCapHeight} stroke={printCapHeightColor} stroke-width="0.75" stroke-dasharray="2,6"/>
						</svg>
					{/each}

					<p class="text-xs text-slate-400 mt-2 italic text-right">
						{verseRef(selectedVerse)} ({data.translation.toUpperCase()})
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Print-only output -->
{#key printRenderKey}
	<div bind:this={printSection} class="print-exact hidden print:block p-8">
		{#if selectedVerse}
			<blockquote class="border-l-4 border-gray-300 pl-4 mb-6">
				<p class="text-gray-700 text-sm leading-relaxed">{cleanText(selectedVerse.text)}</p>
				<footer class="mt-1 text-xs text-gray-500 font-semibold">
					{verseRef(selectedVerse)} — {data.translation.toUpperCase()}
				</footer>
			</blockquote>

			<!-- All verse lines grouped -->
			{#each lines as line}
				<svg viewBox="0 0 {SVG_WIDTH} {worksheetLineHeight}" width="100%" xmlns="http://www.w3.org/2000/svg" overflow="visible" class="block">
					<line x1="0" y1={worksheetDescender} x2={SVG_WIDTH} y2={worksheetDescender} stroke={printDescenderColor} stroke-width="1"/>
					<line x1="0" y1={worksheetBaseline} x2={SVG_WIDTH} y2={worksheetBaseline} stroke={printBaselineColor} stroke-opacity={printBaselineOpacity} stroke-width="1"/>
					<line x1="0" y1={worksheetXHeight} x2={SVG_WIDTH} y2={worksheetXHeight} stroke={printXHeightColor} stroke-width="0.75" stroke-dasharray="4,4"/>
					<line x1="0" y1={worksheetCapHeight} x2={SVG_WIDTH} y2={worksheetCapHeight} stroke={printCapHeightColor} stroke-width="0.75" stroke-dasharray="2,6"/>
					{#if mode === 'tracing'}
						<text x="8" y={worksheetBaseline} font-family={FONT_FAMILY_DASHED} font-size={worksheetFontSize} fill={printTracingColor} word-spacing="{wordSpacing}em">{line}</text>
					{:else}
						<text x="8" y={worksheetBaseline} font-family={FONT_FAMILY} font-size={worksheetFontSize} fill={printTracingColor} word-spacing="{wordSpacing}em">{line}</text>
					{/if}
				</svg>
			{/each}

			<!-- Blank practice lines filling the rest of the page -->
			{#each Array(blankLines) as _}
				<svg viewBox="0 0 {SVG_WIDTH} {worksheetLineHeight}" width="100%" xmlns="http://www.w3.org/2000/svg" overflow="visible" class="block">
					<line x1="0" y1={worksheetDescender} x2={SVG_WIDTH} y2={worksheetDescender} stroke={printDescenderColor} stroke-width="1"/>
					<line x1="0" y1={worksheetBaseline} x2={SVG_WIDTH} y2={worksheetBaseline} stroke={printBaselineColor} stroke-opacity={printBaselineOpacity} stroke-width="1"/>
					<line x1="0" y1={worksheetXHeight} x2={SVG_WIDTH} y2={worksheetXHeight} stroke={printXHeightColor} stroke-width="0.75" stroke-dasharray="4,4"/>
					<line x1="0" y1={worksheetCapHeight} x2={SVG_WIDTH} y2={worksheetCapHeight} stroke={printCapHeightColor} stroke-width="0.75" stroke-dasharray="2,6"/>
				</svg>
			{/each}

			<p class="text-xs text-gray-400 mt-4 text-right italic">
				{verseRef(selectedVerse)} ({data.translation.toUpperCase()})
			</p>
		{/if}
	</div>
{/key}

<style>
	@media print {
		.print-exact,
		.print-exact * {
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
	}
</style>
