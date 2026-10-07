<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { ARC, FIELDS, PRESETS, type ArcOptions } from '$lib/arc';
	import ArcCarousel from '$lib/components/ArcCarousel.svelte';

	let { data } = $props();

	type Value = ArcOptions[keyof ArcOptions];
	const keys = Object.keys(ARC) as (keyof ArcOptions)[];

	let options = $state<ArcOptions>({ ...ARC });
	let limit = $state(Infinity);
	const shown = $derived(Math.min(limit, data.projects.length));
	let collapsed = $state(false);
	let copied = $state('');

	const projects = $derived(data.projects.slice(0, shown));
	const groups = $derived(
		FIELDS.map((g) => ({ ...g, fields: g.fields.filter((f) => !f.only || f.only === options.curve) })).filter((g) => g.fields.length)
	);

	const set = (key: keyof ArcOptions, value: Value) => {
		(options as Record<string, Value>)[key] = value;
		save();
	};

	function encode() {
		const params = new URLSearchParams();
		for (const key of keys) if (options[key] !== ARC[key]) params.set(key, String(options[key]));
		if (shown !== data.projects.length) params.set('count', String(shown));
		return params.toString();
	}

	function save() {
		const hash = encode();
		replaceState(hash ? `#${hash}` : location.pathname, {});
	}

	function apply(preset: Partial<ArcOptions>) {
		options = { ...ARC, ...preset };
		save();
	}

	async function copy(what: 'link' | 'settings') {
		await navigator.clipboard.writeText(what === 'link' ? location.href : JSON.stringify(options, null, '\t'));
		copied = what;
		setTimeout(() => (copied = ''), 1500);
	}

	onMount(() => {
		const params = new URLSearchParams(location.hash.slice(1));
		const next: Record<string, Value> = { ...ARC };
		for (const key of keys) {
			const raw = params.get(key);
			if (raw === null) continue;
			const base = ARC[key];
			next[key] = typeof base === 'number' ? Number(raw) : typeof base === 'boolean' ? raw === 'true' : (raw as ArcOptions['curve']);
		}
		options = next as ArcOptions;
		if (params.has('count')) limit = Math.max(1, Number(params.get('count')));
	});
</script>

<svelte:head>
	<title>Staging · MeTe</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<ArcCarousel {projects} {options} links={false} />

<aside class="panel" class:collapsed>
	<button class="pill" onclick={() => (collapsed = !collapsed)}>{collapsed ? 'Controls' : 'Hide'}</button>

	{#if !collapsed}
		<fieldset>
			<legend>Presets</legend>
			<div class="flex flex-wrap gap-1.5">
				{#each Object.entries(PRESETS) as [name, preset] (name)}
					<button class="pill" onclick={() => apply(preset)}>{name}</button>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend>Curve</legend>
			<div class="flex gap-1.5">
				{#each ['ring', 'line'] as const as curve (curve)}
					<button class="pill" aria-pressed={options.curve === curve} onclick={() => set('curve', curve)}>{curve}</button>
				{/each}
			</div>
		</fieldset>

		{#each groups as group (group.group)}
			<fieldset>
				<legend>{group.group}</legend>
				{#each group.fields as field (field.key)}
					<label>
						<span>{field.label}</span>
						<input
							type="range"
							min={field.min}
							max={field.max}
							step={field.step}
							value={options[field.key] as number}
							oninput={(e) => set(field.key, Number(e.currentTarget.value))}
						/>
						<output>{options[field.key]}</output>
					</label>
				{/each}
			</fieldset>
		{/each}

		<fieldset>
			<legend>Options</legend>
			<label>
				<span>Projects</span>
				<input
					type="range"
					min="1"
					max={data.projects.length}
					step="1"
					value={shown}
					oninput={(e) => {
						limit = Number(e.currentTarget.value);
						save();
					}}
				/>
				<output>{shown}</output>
			</label>
			<label class="check">
				<input type="checkbox" checked={options.vary} onchange={(e) => set('vary', e.currentTarget.checked)} />
				<span>Different wave on every visit</span>
			</label>
			<label class="check">
				<input type="checkbox" checked={options.hinge} onchange={(e) => set('hinge', e.currentTarget.checked)} />
				<span>Keep cards inside their half</span>
			</label>
		</fieldset>

		<div class="flex flex-wrap gap-1.5">
			<button class="pill" onclick={() => copy('link')}>{copied === 'link' ? 'Copied' : 'Copy link'}</button>
			<button class="pill" onclick={() => copy('settings')}>{copied === 'settings' ? 'Copied' : 'Copy settings'}</button>
			<button class="pill" onclick={() => apply({})}>Reset</button>
		</div>
	{/if}
</aside>

<style>
	.panel {
		position: fixed;
		top: var(--pad);
		right: var(--pad);
		z-index: 4000;
		display: flex;
		flex-direction: column;
		gap: var(--pad);
		width: 19rem;
		max-width: calc(100vw - 2 * var(--pad));
		max-height: calc(100dvh - 2 * var(--pad));
		overflow-y: auto;
		padding: var(--pad);
		border: var(--stroke) solid black;
		background: white;
		font-size: 0.8rem;
	}

	.panel.collapsed {
		width: auto;
		padding: 0;
		border: 0;
		background: none;
	}

	.panel > button {
		align-self: flex-end;
	}

	button {
		cursor: pointer;
	}

	button[aria-pressed='true'] {
		background: black;
		color: white;
	}

	legend {
		margin-bottom: 0.3rem;
		font-family: var(--font-serif);
		font-size: 1.3rem;
		font-weight: 400;
		line-height: 1;
	}

	label {
		display: grid;
		grid-template-columns: 6.5rem 1fr 2.6rem;
		align-items: center;
		gap: 0.5rem;
	}

	label.check {
		grid-template-columns: auto 1fr;
	}

	input[type='range'] {
		width: 100%;
		accent-color: black;
	}

	input[type='checkbox'] {
		accent-color: black;
	}

	output {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
</style>
