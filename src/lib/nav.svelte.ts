import { resolve } from '$app/paths';

export const nav = $state({ list: resolve('/') });

export const detail = $state({ width: null as number | null, split: 0.5, resizing: false });
