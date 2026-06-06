<script lang="ts">
	import type { PageData } from './$types';
	import { verseRef, cleanText, TRANSLATIONS, type BibleVerse } from '$lib/bible';
	import { chunkWords, FONT_SIZE, LINE_HEIGHT, BASELINE, CAP_HEIGHT, X_HEIGHT, DESCENDER, type WorksheetStyle } from '$lib/worksheet';

	let { data }: { data: PageData } = $props();

	let selectedBookId = $state<number | null>(null);
	let selectedChapter = $state<number | null>(null);
	let selectedVerse = $state<BibleVerse | null>(null);
	let style = $state<WorksheetStyle>('cursive');
	let mode = $state<'tracing' | 'copywork'>('tracing');
	let copyLines = $state(3);

	// Reset selections when translation changes
	$effect(() => {
		data.translation;
		selectedBookId = null;
		selectedChapter = null;
		selectedVerse = null;
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

	let lines = $derived(selectedVerse ? chunkWords(cleanText(selectedVerse.text)) : []);

	const SVG_WIDTH = 750;
	const FONT_FAMILY = "Caveat, cursive";

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
					<label class="text-xs text-slate-500 block mb-1">Translation</label>
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
					<select id="book-select" onchange={onBookChange}
						class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
						<option value="">— Select a book —</option>
						{#each data.books as book}
							<option value={book.id}>{book.name}</option>
						{/each}
					</select>
				</div>

				<!-- Chapter -->
				<div>
					<label for="chapter-select" class="text-xs text-slate-500 block mb-1">Chapter</label>
					<select id="chapter-select" onchange={onChapterChange} disabled={chapters.length === 0}
						class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-40">
						<option value="">— Select a chapter —</option>
						{#each chapters as ch}
							<option value={ch}>Chapter {ch}</option>
						{/each}
					</select>
				</div>

				<!-- Verse -->
				<div>
					<label for="verse-select" class="text-xs text-slate-500 block mb-1">Verse</label>
					<select id="verse-select" onchange={onVerseChange} disabled={chapterVerses.length === 0}
						class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-40">
						<option value="">— Select a verse —</option>
						{#each chapterVerses as v}
							<option value="{v.chapter}:{v.verse}">v.{v.verse} — {v.text.slice(0, 50)}{v.text.length > 50 ? '…' : ''}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Options -->
			<div class="bg-white rounded-xl shadow-sm p-4 space-y-3">
				<h2 class="font-semibold text-slate-700">Options</h2>

				<div>
					<label class="text-xs text-slate-500 block mb-1">Handwriting Style</label>
					<div class="flex gap-2">
						<button onclick={() => (style = 'cursive')}
							class="px-3 py-1 rounded-full text-xs font-medium border {style === 'cursive'
								? 'bg-indigo-600 text-white border-indigo-600'
								: 'border-slate-300 text-slate-600 hover:border-indigo-400'}">Cursive</button>
						<button onclick={() => (style = 'print')}
							class="px-3 py-1 rounded-full text-xs font-medium border {style === 'print'
								? 'bg-indigo-600 text-white border-indigo-600'
								: 'border-slate-300 text-slate-600 hover:border-indigo-400'}">Print</button>
					</div>
				</div>

				<div>
					<label class="text-xs text-slate-500 block mb-1">Worksheet Mode</label>
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

				{#if mode === 'copywork'}
					<div>
						<label class="text-xs text-slate-500 block mb-1">Blank lines to copy: {copyLines}</label>
						<input type="range" min="1" max="6" bind:value={copyLines} class="w-full" />
					</div>
				{/if}

				{#if selectedVerse}
					<button onclick={() => window.print()}
						class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
						Print Worksheet
					</button>
				{/if}
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
					<p class="text-xs text-slate-400 mb-3 text-center">{style} &bull; {mode}</p>
					{#each lines as line}
						<svg viewBox="0 0 {SVG_WIDTH} {LINE_HEIGHT}" width="100%" xmlns="http://www.w3.org/2000/svg" class="block">
							<!-- Ruled lines -->
							<line x1="0" y1={DESCENDER} x2={SVG_WIDTH} y2={DESCENDER} stroke="#f1f5f9" stroke-width="1"/>
							<line x1="0" y1={BASELINE} x2={SVG_WIDTH} y2={BASELINE} stroke="#cbd5e1" stroke-width="1"/>
							<line x1="0" y1={X_HEIGHT} x2={SVG_WIDTH} y2={X_HEIGHT} stroke="#e2e8f0" stroke-width="0.75" stroke-dasharray="4,4"/>
							<line x1="0" y1={CAP_HEIGHT} x2={SVG_WIDTH} y2={CAP_HEIGHT} stroke="#e2e8f0" stroke-width="0.75" stroke-dasharray="2,6"/>

							{#if mode === 'tracing'}
								<!-- Dotted trace text -->
								<text
									x="8" y={BASELINE}
									font-family={FONT_FAMILY}
									font-size={FONT_SIZE}
									font-weight={style === 'cursive' ? '600' : '400'}
									fill="none"
									stroke="#c7d2fe"
									stroke-width="8"
									stroke-linecap="round"
									stroke-linejoin="round"
									paint-order="stroke"
								>{line}</text>
								<text
									x="8" y={BASELINE}
									font-family={FONT_FAMILY}
									font-size={FONT_SIZE}
									font-weight={style === 'cursive' ? '600' : '400'}
									fill="#e0e7ff"
									stroke="#a5b4fc"
									stroke-width="2"
									stroke-dasharray="6,5"
									paint-order="stroke fill"
								>{line}</text>
							{:else}
								<!-- Solid reference text -->
								<text
									x="8" y={BASELINE}
									font-family={FONT_FAMILY}
									font-size={FONT_SIZE}
									font-weight={style === 'cursive' ? '600' : '400'}
									fill="#334155"
								>{line}</text>
							{/if}
						</svg>

						{#if mode === 'copywork'}
							<!-- Blank ruled lines to copy onto -->
							{#each Array(copyLines) as _}
								<svg viewBox="0 0 {SVG_WIDTH} {LINE_HEIGHT}" width="100%" xmlns="http://www.w3.org/2000/svg" class="block">
									<line x1="0" y1={DESCENDER} x2={SVG_WIDTH} y2={DESCENDER} stroke="#f1f5f9" stroke-width="1"/>
									<line x1="0" y1={BASELINE} x2={SVG_WIDTH} y2={BASELINE} stroke="#cbd5e1" stroke-width="1"/>
									<line x1="0" y1={X_HEIGHT} x2={SVG_WIDTH} y2={X_HEIGHT} stroke="#e2e8f0" stroke-width="0.75" stroke-dasharray="4,4"/>
									<line x1="0" y1={CAP_HEIGHT} x2={SVG_WIDTH} y2={CAP_HEIGHT} stroke="#e2e8f0" stroke-width="0.75" stroke-dasharray="2,6"/>
								</svg>
							{/each}
						{/if}
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
<div class="hidden print:block p-8">
	{#if selectedVerse}
		<blockquote class="border-l-4 border-gray-300 pl-4 mb-6">
			<p class="text-gray-700 text-sm leading-relaxed">{cleanText(selectedVerse.text)}</p>
			<footer class="mt-1 text-xs text-gray-500 font-semibold">
				{verseRef(selectedVerse)} — {data.translation.toUpperCase()}
			</footer>
		</blockquote>

		{#each lines as line}
			<svg viewBox="0 0 {SVG_WIDTH} {LINE_HEIGHT}" width="100%" xmlns="http://www.w3.org/2000/svg" class="block">
				<line x1="0" y1={DESCENDER} x2={SVG_WIDTH} y2={DESCENDER} stroke="#e2e8f0" stroke-width="1"/>
				<line x1="0" y1={BASELINE} x2={SVG_WIDTH} y2={BASELINE} stroke="#94a3b8" stroke-width="1"/>
				<line x1="0" y1={X_HEIGHT} x2={SVG_WIDTH} y2={X_HEIGHT} stroke="#cbd5e1" stroke-width="0.75" stroke-dasharray="4,4"/>
				<line x1="0" y1={CAP_HEIGHT} x2={SVG_WIDTH} y2={CAP_HEIGHT} stroke="#cbd5e1" stroke-width="0.75" stroke-dasharray="2,6"/>

				{#if mode === 'tracing'}
					<text x="8" y={BASELINE} font-family={FONT_FAMILY} font-size={FONT_SIZE}
						font-weight={style === 'cursive' ? '600' : '400'}
						fill="none" stroke="#c7d2fe" stroke-width="8"
						stroke-linecap="round" stroke-linejoin="round" paint-order="stroke">{line}</text>
					<text x="8" y={BASELINE} font-family={FONT_FAMILY} font-size={FONT_SIZE}
						font-weight={style === 'cursive' ? '600' : '400'}
						fill="#e0e7ff" stroke="#a5b4fc" stroke-width="2"
						stroke-dasharray="6,5" paint-order="stroke fill">{line}</text>
				{:else}
					<text x="8" y={BASELINE} font-family={FONT_FAMILY} font-size={FONT_SIZE}
						font-weight={style === 'cursive' ? '600' : '400'}
						fill="#1e293b">{line}</text>
				{/if}
			</svg>

			{#if mode === 'copywork'}
				{#each Array(copyLines) as _}
					<svg viewBox="0 0 {SVG_WIDTH} {LINE_HEIGHT}" width="100%" xmlns="http://www.w3.org/2000/svg" class="block">
						<line x1="0" y1={DESCENDER} x2={SVG_WIDTH} y2={DESCENDER} stroke="#e2e8f0" stroke-width="1"/>
						<line x1="0" y1={BASELINE} x2={SVG_WIDTH} y2={BASELINE} stroke="#94a3b8" stroke-width="1"/>
						<line x1="0" y1={X_HEIGHT} x2={SVG_WIDTH} y2={X_HEIGHT} stroke="#cbd5e1" stroke-width="0.75" stroke-dasharray="4,4"/>
						<line x1="0" y1={CAP_HEIGHT} x2={SVG_WIDTH} y2={CAP_HEIGHT} stroke="#cbd5e1" stroke-width="0.75" stroke-dasharray="2,6"/>
					</svg>
				{/each}
			{/if}
		{/each}

		<p class="text-xs text-gray-400 mt-4 text-right italic">
			{verseRef(selectedVerse)} ({data.translation.toUpperCase()})
		</p>
	{/if}
</div>
