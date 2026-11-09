<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const missing = $derived(page.status === 404);
</script>

<svelte:head><title>{page.status} · MeTe</title></svelte:head>

<section class="sheet grid h-dvh place-items-center bg-grey p-(--pad) text-center">
	<div class="flex flex-col items-center gap-[0.75em]">
		<h1 class="title">{page.status}</h1>
		<p>{missing ? 'This mèta does not exist.' : page.error?.message}</p>
		<a href={resolve('/')} class="pill">Back</a>
	</div>
</section>
