<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>{data.category.name} · Projects · MeTe</title></svelte:head>

<h1 class="sr-only">Projects: {data.category.name}</h1>
