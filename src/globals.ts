/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as globals from './index';

Object.assign(globalThis, {
	...globals,
});

declare global {
	const $: typeof globals.$;
	const ansis: typeof globals.ansis;
	const path: typeof globals.path;
	const argv: typeof globals.argv;
	const args: typeof globals.args; // eslint-disable-line unicorn/prevent-abbreviations
	const flags: typeof globals.flags;
	const select: typeof globals.select;
	const $spinner: typeof globals.$spinner;
	const cd: typeof globals.cd;
	const ack: typeof globals.ack;
	const isDirectory: typeof globals.isDirectory;
	const ensureDirectory: typeof globals.ensureDirectory;
	const notMinimist: typeof globals.notMinimist;
	const Exit: typeof globals.Exit; // eslint-disable-line @typescript-eslint/naming-convention
	const $HOME: typeof globals.$HOME;
	const $get: typeof globals.$get;
	const glob: typeof globals.glob;
}

// export type ExtendedGlobal = typeof globalThis;
const customGlobalsFile = `${$HOME}/.bunmagic/custom-globals.ts`;
// @ts-ignore
if (await Bun.file(customGlobalsFile).exists()) {
	// @ts-ignore
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const customGlobals = await import(customGlobalsFile);
	Object.assign(globalThis, customGlobals);
}
