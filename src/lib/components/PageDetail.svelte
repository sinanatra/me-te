<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Page } from '$lib/wp';

	let { page, closeHref }: { page: Page; closeHref: string } = $props();
</script>

<article class="relative h-full w-(--open-width) flex-none py-(--stroke) max-sm:py-14">
	<a href={closeHref} class="absolute top-[calc(var(--stroke)+var(--pad))] right-[calc(var(--stroke)+var(--pad))] z-10 text-2xl leading-none max-sm:top-4 max-sm:right-auto max-sm:left-1/2 max-sm:-translate-x-1/2" aria-label="Close">×</a>

	{#key page.slug}
		<section class="sides reading h-full overflow-y-auto overscroll-contain bg-[rgb(255,250,161)]" in:fade={{ duration: 300 }}>
			<div class="p-(--pad) pb-8">
				<h1 class="reading-title">{@html page.title}</h1>
				<div class="content">{@html page.content}</div>
			</div>
		</section>
	{/key}
</article>

<style>
	.sides {
		border-inline: var(--stroke) solid black;
	}

	@media (max-width: 640px) {
		.sides {
			border-inline: 0;
		}
	}
</style>
