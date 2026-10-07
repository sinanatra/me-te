<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Category } from '$lib/wp';

	let { categories }: { categories: Category[] } = $props();

	const links = $derived([
		{ href: resolve('/projects'), label: 'all' },
		...categories.map((c) => ({ href: resolve(`/projects/category/${c.slug}`), label: c.name }))
	]);
</script>

<nav aria-label="Categories" class="pointer-events-none fixed inset-x-0 bottom-0 z-[2000] flex justify-center pb-(--pad) [&_a]:pointer-events-auto">
	<ul class="flex gap-2">
		{#each links as link (link.href)}
			<li>
				<a href={link.href} class="pill" aria-current={page.url.pathname === link.href ? 'page' : undefined}>
					{@html link.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
