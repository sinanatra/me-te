<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import font from '$lib/assets/fonts/ABCArealSemiMonoVariable.woff2?url';
	import { LOGO } from '$lib/config';
	import './layout.css';

	let { children } = $props();

	onMount(() => {
		console.log('Website designed and developed by Giacomo Nanni');
		console.log('https://giacomo.website');
	});
</script>

<svelte:head>
	<link rel="preload" href={font} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div class="frame" aria-hidden="true"></div>
<a href={resolve('/')} class="logo"><img src={LOGO} alt="MeTe" width="768" height="432" /></a>

<main>
	{@render children()}
</main>

<footer class="text-sm">
	<nav aria-label="Main">
		<a href={resolve('/about')} class="fixed bottom-(--pad) left-(--pad) z-[2000]">About</a>
	</nav>
</footer>
