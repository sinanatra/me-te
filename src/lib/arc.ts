export type ArcOptions = {
	curve: 'ring' | 'line';
	frontAngle: number;
	sweep: number;
	radius: number;
	centerY: number;
	spiral: number;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	step: number;
	farScale: number;
	blur: number;
	size: number;
	frontTurn: number;
	endTurn: number;
	turnEase: number;
	wave: number;
	waves: number;
	vary: boolean;
	scatter: number;
	tilt: number;
	hinge: boolean;
};

export const ARC: ArcOptions = {
	curve: 'ring',
	frontAngle: 200,
	sweep: 110,
	radius: 0.43,
	centerY: 0.53,
	spiral: 0,
	startX: 0.45,
	startY: 0.68,
	endX: 1,
	endY: 0.08,
	step: 0.15,
	farScale: 0.06,
	blur: 3,
	size: 1,
	frontTurn: 4,
	endTurn: 90,
	turnEase: 1.4,
	wave: 0.075,
	waves: 1.25,
	vary: true,
	scatter: 0,
	tilt: 0,
	hinge: true
};

const scattered: Partial<ArcOptions> = {
	sweep: 85,
	radius: 0.5,
	centerY: 0.45,
	spiral: 0.52,
	step: 0.2,
	size: 0.98,
	frontTurn: 0,
	endTurn: 0,
	turnEase: 3,
	wave: 0.185,
	waves: 1.85,
	vary: false,
	scatter: 0.35,
	tilt: 14,
	hinge: false
};

export const LOOKS: Partial<ArcOptions>[] = [
	{ ...scattered, curve: 'line' },
	scattered,
	{ endTurn: 0, turnEase: 3, wave: 0, vary: false, scatter: 0.35, tilt: 14, hinge: false },
	{
		curve: 'line',
		startY: 0.5,
		endY: 0.19,
		step: 0.25,
		farScale: 0.39,
		size: 1.27,
		frontTurn: 0,
		endTurn: 0,
		turnEase: 3,
		wave: 0,
		waves: 0.85,
		scatter: 0.69
	},
	{ curve: 'line', startX: 0.51, startY: 0.74, endY: 0, endTurn: 0, wave: 0.18, waves: 0.25 }
];

export const randomLook = (): ArcOptions => ({ ...ARC, ...LOOKS[Math.floor(Math.random() * LOOKS.length)] });

export const PRESETS: Record<string, Partial<ArcOptions>> = {
	...Object.fromEntries(LOOKS.map((look, i) => [`Look ${i + 1}`, look])),
	Ring: {},
	Spiral: { sweep: 470, spiral: 0.85, step: 0.12, farScale: 0.05, endTurn: 40, wave: 0, vary: false, hinge: false },
	Road: { curve: 'line', startY: 0.7, endY: 0.06, wave: 0.18, waves: 1.5 },
	Diagonal: { curve: 'line', startX: 0.5, startY: 0.7, endX: 0.08, endY: 0.1, endTurn: 30, wave: 0, vary: false, hinge: false },
	Tunnel: { curve: 'line', startY: 0.62, endX: 1, endY: 0.5, farScale: 0.03, endTurn: 70, wave: 0, vary: false },
	Scattered: { scatter: 0.35, tilt: 14, endTurn: 50, wave: 0, vary: false, hinge: false }
};

export type ArcField = {
	key: keyof ArcOptions;
	label: string;
	min: number;
	max: number;
	step: number;
	only?: ArcOptions['curve'];
};

export const FIELDS: { group: string; fields: ArcField[] }[] = [
	{
		group: 'Ring',
		fields: [
			{ key: 'frontAngle', label: 'Front angle', min: 90, max: 270, step: 1, only: 'ring' },
			{ key: 'sweep', label: 'Sweep', min: 20, max: 720, step: 5, only: 'ring' },
			{ key: 'radius', label: 'Radius', min: 0.1, max: 0.8, step: 0.01, only: 'ring' },
			{ key: 'centerY', label: 'Centre height', min: 0.2, max: 0.9, step: 0.01, only: 'ring' },
			{ key: 'spiral', label: 'Spiral', min: 0, max: 1, step: 0.01, only: 'ring' }
		]
	},
	{
		group: 'Line',
		fields: [
			{ key: 'startX', label: 'Start x', min: 0, max: 1, step: 0.01, only: 'line' },
			{ key: 'startY', label: 'Start y', min: 0, max: 1, step: 0.01, only: 'line' },
			{ key: 'endX', label: 'End x', min: 0, max: 1, step: 0.01, only: 'line' },
			{ key: 'endY', label: 'End y', min: 0, max: 1, step: 0.01, only: 'line' }
		]
	},
	{
		group: 'Cards',
		fields: [
			{ key: 'size', label: 'Size', min: 0.4, max: 1.4, step: 0.01 },
			{ key: 'step', label: 'Spacing', min: 0.04, max: 0.6, step: 0.01 },
			{ key: 'farScale', label: 'Last card size', min: 0.02, max: 0.6, step: 0.01 },
			{ key: 'blur', label: 'Depth blur', min: 0, max: 12, step: 0.5 },
			{ key: 'frontTurn', label: 'Front turn', min: 0, max: 60, step: 1 },
			{ key: 'endTurn', label: 'End turn', min: 0, max: 90, step: 1 },
			{ key: 'turnEase', label: 'Turn easing', min: 0.3, max: 3, step: 0.05 }
		]
	},
	{
		group: 'Variation',
		fields: [
			{ key: 'wave', label: 'Wave', min: 0, max: 0.4, step: 0.005 },
			{ key: 'waves', label: 'Wave count', min: 0.25, max: 4, step: 0.05 },
			{ key: 'scatter', label: 'Scatter', min: 0, max: 1, step: 0.01 },
			{ key: 'tilt', label: 'Tilt', min: 0, max: 45, step: 1 }
		]
	}
];
