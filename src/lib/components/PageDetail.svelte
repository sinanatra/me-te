<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Page } from '$lib/wp';

	let { page, closeHref }: { page: Page; closeHref: string } = $props();
</script>

<article class="relative h-full w-(--open-width) flex-none py-(--stroke) max-sm:pt-0 max-sm:pb-[calc(var(--bar)+2*var(--pad))]">
	<a href={closeHref} class="absolute top-[calc(var(--stroke)+var(--pad))] right-[calc(var(--stroke)+var(--pad))] z-10 text-2xl leading-none max-sm:top-auto max-sm:bottom-(--pad) max-sm:right-auto max-sm:left-1/2 max-sm:flex max-sm:h-(--bar) max-sm:-translate-x-1/2 max-sm:items-center" aria-label="Close">×</a>

	{#key page.slug}
		<section class="sheet h-full overflow-y-auto overscroll-contain border-x-(length:--stroke) border-black bg-sun max-sm:border-x-0" in:fade={{ duration: 300 }}>
			<div class="flex flex-col gap-[0.75em] p-(--pad) pb-8">
				<h1 class="title">{@html page.title}</h1>
				<div class="content">{@html page.content}</div>
			</div>
		</section>
	{/key}
</article>
