<script lang="ts">
	import type { PageData } from './$types';
	import { searchVerses, verseRef, TRANSLATIONS, type BibleVerse } from '$lib/bible';
	import { renderLine, chunkWords, type WorksheetStyle } from '$lib/worksheet';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let selectedVerse = $state<BibleVerse | null>(null);
	let style = $state<WorksheetStyle>('cursive');
	let mode = $state<'tracing' | 'copywork'>('tracing');
	let copyLines = $state(3);

	let results = $derived(searchVerses(data.verses, query));

	let lines = $derived(() => {
		if (!selectedVerse) return [];
		return chunkWords(selectedVerse.text, 28);
	});

	let rendered = $derived(() => {
		if (!selectedVerse) return [];
		return lines().map((l) => renderLine(l, style));
	});

	function selectVerse(v: BibleVerse) {
		selectedVerse = v;
		query = '';
	}
</script>

<svelte:head>
	<title>Cursive Verses — Bible Worksheet Maker</title>
</svelte:head>

<!-- Controls — hidden on print -->
<div class="no-print min-h-screen bg-slate-50 p-4">
	<header class="mb-6">
		<h1 class="text-2xl font-bold text-slate-800">Cursive Verses</h1>
		<p class="text-slate-500 text-sm">Create handwriting worksheets from Bible verses</p>
	</header>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<!-- Left: Search & Select -->
		<div class="md:col-span-1 space-y-3">
			<div class="bg-white rounded-xl shadow-sm p-4 space-y-3">
				<h2 class="font-semibold text-slate-700">Find a Verse</h2>

				<!-- Translation picker -->
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

				<!-- Search -->
				<input
					type="search"
					placeholder="Search verse text…"
					bind:value={query}
					class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
				/>

				{#if results.length > 0}
					<ul class="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
						{#each results as v}
							<li>
								<button
									onclick={() => selectVerse(v)}
									class="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors"
								>
									<span class="text-xs font-semibold text-indigo-600 block">{verseRef(v)}</span>
									<span class="text-xs text-slate-600 line-clamp-2">{v.text}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				{#if selectedVerse}
					<div class="bg-indigo-50 rounded-lg p-3">
						<p class="text-xs font-semibold text-indigo-700">{verseRef(selectedVerse)}</p>
						<p class="text-xs text-slate-700 mt-1">{selectedVerse.text}</p>
					</div>
				{/if}
			</div>

			<!-- Worksheet options -->
			<div class="bg-white rounded-xl shadow-sm p-4 space-y-3">
				<h2 class="font-semibold text-slate-700">Options</h2>

				<div>
					<label class="text-xs text-slate-500 block mb-1">Handwriting Style</label>
					<div class="flex gap-2">
						{#each ['print', 'pre-cursive', 'cursive'] as s}
							<button
								onclick={() => (style = s as WorksheetStyle)}
								class="px-3 py-1 rounded-full text-xs font-medium border {style === s
									? 'bg-indigo-600 text-white border-indigo-600'
									: 'border-slate-300 text-slate-600 hover:border-indigo-400'}"
							>{s}</button>
						{/each}
					</div>
				</div>

				<div>
					<label class="text-xs text-slate-500 block mb-1">Worksheet Mode</label>
					<div class="flex gap-2">
						<button
							onclick={() => (mode = 'tracing')}
							class="px-3 py-1 rounded-full text-xs font-medium border {mode === 'tracing'
								? 'bg-indigo-600 text-white border-indigo-600'
								: 'border-slate-300 text-slate-600 hover:border-indigo-400'}"
						>Tracing</button>
						<button
							onclick={() => (mode = 'copywork')}
							class="px-3 py-1 rounded-full text-xs font-medium border {mode === 'copywork'
								? 'bg-indigo-600 text-white border-indigo-600'
								: 'border-slate-300 text-slate-600 hover:border-indigo-400'}"
						>Copywork</button>
					</div>
				</div>

				{#if mode === 'copywork'}
					<div>
						<label class="text-xs text-slate-500 block mb-1">Blank lines to copy: {copyLines}</label>
						<input type="range" min="1" max="6" bind:value={copyLines} class="w-full" />
					</div>
				{/if}

				{#if selectedVerse}
					<button
						onclick={() => window.print()}
						class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
					>Print Worksheet</button>
				{/if}
			</div>
		</div>

		<!-- Right: Preview -->
		<div class="md:col-span-2">
			<div class="bg-white rounded-xl shadow-sm p-4 min-h-96">
				{#if !selectedVerse}
					<p class="text-slate-400 text-sm text-center pt-16">Search for a verse to preview the worksheet</p>
				{:else}
					<div id="worksheet-preview">
						<p class="text-xs text-slate-400 mb-4 text-center">{verseRef(selectedVerse)} — {data.translation.toUpperCase()} — {style}</p>
						{#each rendered() as r, i}
							{#if r}
								<div class="mb-2">
									<!-- Tracing line -->
									<svg
										viewBox="0 0 {r.width} {r.height}"
										width="100%"
										style="max-width:{r.width}px"
										xmlns="http://www.w3.org/2000/svg"
									>
										<!-- Baseline rule -->
										<line x1="0" y1={r.baseline} x2={r.width} y2={r.baseline} stroke="#d1d5db" stroke-width="1" />
										<!-- x-height rule -->
										<line x1="0" y1={r.baseline - r.xHeight} x2={r.width} y2={r.baseline - r.xHeight} stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="4,4" />

										<!-- Handwriting path -->
										{#if mode === 'tracing'}
											<path
												d={r.svgPath}
												fill="none"
												stroke="#94a3b8"
												stroke-width="3"
												stroke-dasharray="6,4"
												stroke-linecap="round"
											/>
											<!-- Formation annotations -->
											{#each r.annotationPaths as ap}
												<path d={ap} fill="none" stroke="#6366f1" stroke-width="1.5" />
											{/each}
										{:else}
											<!-- Copywork: show solid reference -->
											<path d={r.svgPath} fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
										{/if}
									</svg>
								</div>
							{/if}
						{/each}

						<!-- Blank copy lines -->
						{#if mode === 'copywork'}
							{#each Array(copyLines) as _}
								<div class="border-b border-slate-300 h-10 mt-2"></div>
							{/each}
						{/if}

						<!-- Reference text -->
						<p class="text-xs text-slate-500 mt-4 italic text-right">
							{verseRef(selectedVerse)} ({data.translation.toUpperCase()})
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Print-only output -->
<div class="hidden print:block p-8">
	{#if selectedVerse}
		<h2 class="text-sm text-gray-500 mb-6 text-center">{verseRef(selectedVerse)} — {data.translation.toUpperCase()}</h2>
		{#each rendered() as r}
			{#if r}
				<svg
					viewBox="0 0 {r.width} {r.height}"
					width="100%"
					xmlns="http://www.w3.org/2000/svg"
					class="mb-2"
				>
					<line x1="0" y1={r.baseline} x2={r.width} y2={r.baseline} stroke="#9ca3af" stroke-width="1" />
					<line x1="0" y1={r.baseline - r.xHeight} x2={r.width} y2={r.baseline - r.xHeight} stroke="#d1d5db" stroke-width="0.5" stroke-dasharray="4,4" />
					{#if mode === 'tracing'}
						<path d={r.svgPath} fill="none" stroke="#9ca3af" stroke-width="3" stroke-dasharray="6,4" stroke-linecap="round" />
						{#each r.annotationPaths as ap}
							<path d={ap} fill="none" stroke="#6366f1" stroke-width="1.5" />
						{/each}
					{:else}
						<path d={r.svgPath} fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" />
					{/if}
				</svg>
			{/if}
		{/each}
		{#if mode === 'copywork'}
			{#each Array(copyLines) as _}
				<div class="border-b border-gray-300 h-12 mt-2"></div>
			{/each}
		{/if}
		<p class="text-xs text-gray-400 mt-6 text-right italic">
			{verseRef(selectedVerse)} ({data.translation.toUpperCase()})
		</p>
	{/if}
</div>
