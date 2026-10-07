<script lang="ts">
  import { goto } from "$app/navigation";
  import { untrack, type Snippet } from "svelte";
  import { Spring } from "svelte/motion";
  import { ARC, type ArcOptions } from "$lib/arc";
  import { PALETTE } from "$lib/config";
  import { detail } from "$lib/nav.svelte";
  import { projectHref, type Project } from "$lib/wp";
  import { plain } from "$lib/text";

  let {
    projects,
    current = null,
    open: isOpen = !!current,
    options = ARC,
    links = true,
    onnavigate,
    onclose,
    children,
  }: {
    projects: Project[];
    current?: string | null;
    open?: boolean;
    options?: ArcOptions;
    links?: boolean;
    onnavigate?: (project: Project) => void;
    onclose?: () => void;
    children?: Snippet;
  } = $props();

  const o = $derived(options);
  const shrink = $derived(1 - o.farScale);

  let half = $state(0);
  let height = $state(0);
  const itemWidth = $derived(
    o.size *
      (2 * half <= 640 ? 0.92 * half : Math.min(0.82 * half, 0.66 * height)),
  );

  const position = new Spring(0, { stiffness: 0.1, damping: 0.9 });

  function makeRoad() {
    const vary = (spread: number) =>
      o.vary ? 1 + (Math.random() * 2 - 1) * spread : 1;
    const sign = o.vary && Math.random() < 0.5 ? -1 : 1;
    return { amplitude: o.wave * vary(0.33) * sign, waves: o.waves * vary(0.28) };
  }

  const road = new Spring(makeRoad(), { stiffness: 0.04, damping: 0.8 });

  const roadKey = $derived(
    [projects.map((p) => p.id).join(), o.wave, o.waves, o.vary].join("|"),
  );
  let lastRoad: string | null = null;
  $effect(() => {
    if (lastRoad !== null && lastRoad !== roadKey) road.target = makeRoad();
    lastRoad = roadKey;
  });

  function bend(f: number) {
    if (f <= 0) return 0;
    const { amplitude, waves } = road.current;
    return amplitude * (1 - f * f) * Math.sin(Math.PI * 2 * waves * f);
  }

  const noise = (index: number, seed: number) => {
    const v = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
    return (v - Math.floor(v)) * 2 - 1;
  };

  const count = $derived(projects.length);
  const mod = (n: number) => ((n % count) + count) % count;
  const active = $derived(mod(Math.round(position.target)));

  function offset(index: number, from: number) {
    const t = mod(index - from);
    return t > count - 1 ? t - count : t;
  }

  function shortest(index: number, from: number) {
    const t = mod(index - from);
    return t >= count / 2 ? t - count : t;
  }

  function go(target: number) {
    position.target = target;
  }

  function nearest(index: number) {
    const from = Math.round(position.target);
    return from + shortest(index, from);
  }

  function settleOn(target: number) {
    go(target);
    const project = projects[active];
    if (!isOpen || !project || project.slug === current) return;
    if (project.detail) onnavigate?.(project);
    else onclose?.();
  }

  let synced: string | null = null;
  $effect(() => {
    const slug = current;
    untrack(() => {
      if (slug === synced) return;
      synced = slug;
      const index = projects.findIndex((p) => p.slug === slug);
      if (index >= 0 && index !== active) go(nearest(index));
    });
  });

  const step = $derived(
    count > 1
      ? Math.max(o.step, Math.log(1 / o.farScale) / (shrink * (count - 1)))
      : o.step,
  );

  function recede(t: number) {
    return t >= 0 ? Math.min(1, (1 - Math.exp(-shrink * step * t)) / shrink) : 0;
  }

  const boxRatio = $derived(2 * half <= 640 ? 3 / 4 : 4 / 3);

  function coverWidth(project: Project) {
    const { width = 0, height = 0 } = project.cover ?? {};
    if (!width || !height) return null;
    const ratio = width / height;
    return {
      ratio,
      width: ratio >= boxRatio ? itemWidth : (itemWidth / boxRatio) * ratio,
    };
  }

  function point(f: number) {
    const wave = bend(f);
    if (o.curve === "line")
      return {
        x: half * (o.startX + (o.endX - o.startX) * f + wave),
        y: height * (o.startY + (o.endY - o.startY) * f),
      };
    const angle = ((o.frontAngle - o.sweep * f) * Math.PI) / 180;
    const portrait = height > 2.4 * half;
    const grow = (1 + wave) * (1 - o.spiral * f);
    const rx = Math.min(o.radius * height, 0.68 * half);
    const ry = portrait ? 0.3 * height : rx;
    return {
      x: half + rx * grow * Math.cos(angle),
      y: o.centerY * height - ry * grow * Math.sin(angle),
    };
  }

  function place(index: number, side: "left" | "right") {
    const t = offset(index, position.current);
    const f = recede(t);
    const scale = (1 - shrink * f) * Math.max(0, Math.min(1, count - 1 - t));
    if (scale < 0.02 || recede(t - 1) >= 1) return "visibility: hidden";

    const loose = Math.max(0, Math.min(1, t));
    const spread = o.scatter * half * scale * loose;
    const on = point(f);
    const px = on.x + noise(index, 1) * spread;
    const py = on.y + noise(index, 2) * spread;
    const y = t < 0 ? py - t * (1.5 * height - py) : py;
    const turn = o.frontTurn + (o.endTurn - o.frontTurn) * f ** o.turnEase;
    const tilt = noise(index, 3) * o.tilt * loose;

    const fitted = side === "left" ? coverWidth(projects[index]) : null;
    const width = fitted?.width ?? itemWidth;
    const reach = (width * scale * Math.cos((turn * Math.PI) / 180)) / 2;
    const x = o.hinge ? Math.max(reach + 8, Math.min(px, half - reach)) : px;
    const mirror = side === "right";
    const flip = mirror ? -1 : 1;

    return [
      `z-index: ${1000 - Math.round(t * 50)}`,
      `transform: translate(${mirror ? half - x : x}px, ${y}px) translate(-50%, -50%) scale(${scale}) rotateZ(${flip * tilt}deg) rotateY(${flip * turn}deg)`,
      `pointer-events: ${t < -0.5 ? "none" : "auto"}`,
      ...(fitted
        ? [`width: ${fitted.width}px`, `aspect-ratio: ${fitted.ratio}`]
        : []),
    ].join(";");
  }

  let settle: ReturnType<typeof setTimeout>;
  function onwheel(event: WheelEvent) {
    event.preventDefault();
    const delta =
      Math.abs(event.deltaY) > Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
    const direction = Math.sign(delta);
    go(position.target + Math.max(-120, Math.min(120, delta)) / 250);
    clearTimeout(settle);
    settle = setTimeout(() => {
      const t = position.target;
      settleOn(direction > 0 ? Math.ceil(t - 0.1) : Math.floor(t + 0.1));
    }, 140);
  }

  let drag: { y: number; from: number; moved: boolean } | null = null;
  function onpointerdown(event: PointerEvent) {
    drag = { y: event.clientY, from: position.target, moved: false };
  }
  function onpointermove(event: PointerEvent) {
    if (!drag) return;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) <= 4) return;
    drag.moved = true;
    go(drag.from + dy / 120);
  }
  function onpointerup() {
    if (drag?.moved) settleOn(Math.round(position.target));
    setTimeout(() => (drag = null));
  }

  function onkeydown(event: KeyboardEvent) {
    if (["ArrowDown", "ArrowRight"].includes(event.key))
      settleOn(Math.round(position.target) + 1);
    else if (["ArrowUp", "ArrowLeft"].includes(event.key))
      settleOn(Math.round(position.target) - 1);
    else return;
    event.preventDefault();
  }

  function select(event: MouseEvent, index: number) {
    if (!drag?.moved && index === active && current === projects[index].slug) {
      event.preventDefault();
      onclose?.();
      return;
    }
    if (drag?.moved || index !== active || !projects[index].detail || !links) {
      event.preventDefault();
      if (!drag?.moved && index !== active) settleOn(nearest(index));
    }
  }

  function open(event: MouseEvent, index: number) {
    select(event, index);
    if (!event.defaultPrevented) goto(projectHref(projects[index]));
  }

  function description(project: Project) {
    const text = plain(project.excerpt).trim();
    const title = plain(project.title).trim();
    return text.startsWith(title) ? text.slice(title.length).trim() : text;
  }
</script>

<svelte:window {onkeydown} {onpointermove} {onpointerup} />

<div
  class="curtains flex h-dvh w-full justify-center overflow-hidden bg-[#dddddd]"
  class:open={isOpen}
  class:resizing={detail.resizing}
  style="--item-width: {itemWidth}px;{detail.width
    ? `--open-width: ${detail.width}px`
    : ''}"
  aria-roledescription="carousel"
  aria-label="Projects"
  role="region"
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="half left"
    bind:clientWidth={half}
    bind:clientHeight={height}
    {onwheel}
    {onpointerdown}
  >
    {#if half && count}
      {#each projects as project, i (project.id)}
        <a
          href={project.detail && links ? projectHref(project) : undefined}
          class="item"
          class:closed={!project.detail && i === active}
          style={place(i, "left")}
          aria-label={plain(project.title)}
          aria-current={i === active ? "true" : undefined}
          tabindex={i === active ? 0 : -1}
          draggable="false"
          onclick={(e) => select(e, i)}
        >
          {#if project.cover}
            <img
              src={project.cover.thumb}
              alt={project.cover.alt}
              draggable="false"
              decoding="async"
            />
          {:else}
            <span class="grid h-full place-items-center text-lg"
              >{@html project.title}</span
            >
          {/if}
        </a>
      {/each}
    {/if}
  </div>

  <section class="stage-center" aria-label="Project" inert={!isOpen}>
    {@render children?.()}
  </section>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="half right" {onwheel} {onpointerdown}>
    {#if half && count}
      {#each projects as project, i (project.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="item card"
          class:closed={!project.detail && i === active}
          style="{place(i, 'right')};background:{PALETTE[i % PALETTE.length]
            .bg};color:{PALETTE[i % PALETTE.length].fg}"
          aria-hidden={i === active ? undefined : "true"}
          role="presentation"
          onclick={(e) => open(e, i)}
        >
          <h2 class="title" class:outline={PALETTE[i % PALETTE.length].outline}>
            {@html project.title}
          </h2>
          {#if project.categories.length}
            <ul class="meta flex flex-wrap gap-[1cqi]">
              {#each project.categories as category (category)}
                <li class="pill">{category}</li>
              {/each}
            </ul>
          {/if}
          <p class="text">{description(project)}</p>
          {#if project.links.length || project.detail}
            <div class="foot">
              <ul class="links">
                {#each project.links as link (link.href)}
                  <li>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="external noopener"
                      class="link"
                      tabindex={i === active ? 0 : -1}
                      onclick={(e) => e.stopPropagation()}>↗ {link.label}</a
                    >
                  </li>
                {/each}
              </ul>
              {#if project.detail}
                <span class="more" aria-hidden="true">Open →</span>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <p class="sr-only" aria-live="polite">
    {plain(projects[active]?.title ?? "")}
  </p>
</div>

<style>
  .half {
    position: relative;
    flex: none;
    width: 50vw;
    height: 100%;
    touch-action: none;
    user-select: none;
    perspective: 1600px;
  }

  .half.left {
    perspective-origin: 100% 50%;
    background: white;
  }

  .half.right {
    perspective-origin: 0% 50%;
    background: #efefef;
  }

  .curtains {
    --open-width: min(52vw, 960px);
    --ease: 900ms cubic-bezier(0.65, 0, 0.35, 1);
  }

  .stage-center {
    flex: none;
    display: flex;
    justify-content: center;
    width: var(--open-width);
    height: 100%;
    overflow: hidden;
    background: #f2f2f2;
    clip-path: inset(0 50%);
    transition: clip-path var(--ease);
  }

  .half {
    transition: translate var(--ease);
  }

  .half.left {
    translate: calc(var(--open-width) / 2) 0;
  }

  .half.right {
    translate: calc(var(--open-width) / -2) 0;
  }

  .open .stage-center {
    clip-path: inset(0 0);
  }

  .open .half {
    translate: none;
  }

  .resizing .stage-center,
  .resizing .half {
    transition: none;
  }

  .item {
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    width: var(--item-width);
    aspect-ratio: 4 / 3;
    transform-origin: center;
    background: white;
    outline: 1px solid black;
    will-change: transform;
    cursor: pointer;
  }

  .item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: auto;
    max-height: calc(var(--item-width) * 3 / 4);
    aspect-ratio: auto;
    padding: var(--pad);
    container-type: inline-size;
  }

  .title {
    display: -webkit-box;
    overflow: hidden;
    font-family: var(--font-serif);
    font-weight: 400;
    flex: none;
    margin-top: -0.12em;
    padding-block: 0.12em 0.16em;
    font-size: 9cqi;
    line-height: 0.98;
    letter-spacing: -0.015em;
    text-wrap: balance;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }

  .title.outline {
    color: transparent;
    -webkit-text-stroke: 1px white;
  }

  .meta {
    --pill-size: 2.1cqi;
    margin-top: 3cqi;
  }

  .text {
    display: -webkit-box;
    max-width: 34em;
    margin-top: 3cqi;
    overflow: hidden;
    font-size: 3.2cqi;
    line-height: 1.35;
    text-wrap: pretty;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    line-clamp: 6;
  }

  .foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.4em;
    margin-top: auto;
    padding-top: 3cqi;
    font-size: 2.4cqi;
    letter-spacing: 0.02em;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4em 1.4em;
  }

  .more {
    flex: none;
    margin-left: auto;
  }

  .item.closed {
    cursor: default;
  }

  @media (max-width: 640px) {
    .curtains {
      --open-width: 100vw !important;
    }

    .half {
      perspective: 1000px;
    }

    .item {
      aspect-ratio: 3 / 4;
    }

    .title {
      font-size: 11cqi;
    }

    .text {
      font-size: 5.6cqi;
      -webkit-line-clamp: 10;
      line-clamp: 10;
    }

    .card {
      max-height: calc(var(--item-width) * 4 / 3);
      aspect-ratio: auto;
    }

    .meta,
    .links {
      display: none;
    }

    .foot {
      font-size: 4.5cqi;
    }
  }
</style>
