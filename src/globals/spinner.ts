/* eslint-disable @typescript-eslint/prefer-readonly */
import {$} from 'bun';
import ansis from 'ansis';

class Spinner {
	private static spinners: Spinner[] = [];
	private static linesRendered = 0;
	private static interval: ReturnType<typeof setInterval> | undefined;
	private static consoleRef = console;

	private static async tick() {
		const lines: string[] = [];

		for (const spinner of Spinner.spinners) {
			lines.push(await spinner.frame());
		}

		if (Spinner.linesRendered !== 0) {
			await this.clearLines(Spinner.linesRendered);
		}

		for (const line of lines) {
			await Bun.write(Bun.stdout, `${line}\n`);
		}

		Spinner.linesRendered = lines.map(line => line.split('\n').length).reduce((a, b) => a + b, 0);
	}

	private static async stdout(s: string) {
		return Bun.write(Bun.stdout, s);
	}

	private static async moveUp(count = 1) {
		await Spinner.stdout(`\u001B[${count}A`);
	}

	private static async clearLines(count = 1) {
		await Spinner.moveUp(count);
		await Spinner.stdout('\u001B[2K'.repeat(count));
	}

	private static async hideCursor() {
		await Spinner.stdout('\u001B[?25l');
	}

	private static async showCursor() {
		await Spinner.stdout('\u001B[?25h');
	}

	private static disableConsole() {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const noop = () => {};
		Reflect.set(globalThis, 'console', new Proxy(console, {
			get() {
				return noop;
			},
		}));
	}

	private static enableConsole() {
		Reflect.set(globalThis, 'console', Spinner.consoleRef);
	}

	private static async onFirstStart() {
		Spinner.interval ||= setInterval(async () => {
			await Spinner.tick();
		}, 120);
		Spinner.disableConsole();
		await Spinner.hideCursor();
	}

	private static async onFinalStop(frame: string) {
		await Spinner.tick();
		await Spinner.stdout('\r');
		await Spinner.stdout(' '.repeat(frame.length));
		await Spinner.stdout('\r');
		await Spinner.showCursor();
		Spinner.enableConsole();

		clearInterval(Spinner.interval);
		Spinner.interval = undefined;
		Spinner.linesRendered = 0;
		Spinner.spinners = [];
	}

	private status: 'inactive' | 'running' | 'success' | 'error' = 'inactive';
	private animationIndex = 0;
	private label: string | undefined;
	private animation = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map(s => ansis.dim(s));
	private error: Error | undefined;


	public setLabel = (text: string) => {
		this.label = text;
	};

	async frame() {
		let flag = ' ';
		let output = '';
		if (this.status === 'running') {
			this.animationIndex = (this.animationIndex + 1) % this.animation.length;
			flag = this.animation[this.animationIndex];
		}

		if (this.status === 'success') {
			flag = ansis.green('✔');
		}

		if (this.status === 'error') {
			flag = ansis.red('✖');
		}


		if (this.label && this.label.trim() !== '') {
			output = `${flag} ${this.label || ''}`;
		} else if (this.status === 'running') {
			output = flag;
		}

		if (this.error) {
			const debugMessage = ansis.dim(' (Use --debug to see the full error stack.)');
			output += `${ansis.red(this.error.message)}${argv.debug ? '' : debugMessage}`;
			if (argv.debug) {
				output += ansis.dim(`\n${this.error.stack}`);
			}
		}

		return output;
	}

	async start() {
		if (Spinner.spinners.length === 0) {
			await Spinner.onFirstStart();
		}

		Spinner.spinners.push(this);
		this.status = 'running';
	}

	async stop() {
		if (this.status === 'running') {
			this.status = 'inactive';
		}

		if (Spinner.spinners.filter(spinner => spinner.status === 'running').length === 0) {
			const frame = await this.frame();
			await Spinner.onFinalStop(frame);
		}
	}

	public setError(error: unknown) {
		if (error instanceof Error) {
			this.error = error;
		}

		this.error = new Error(String(error));
	}

	public setStatus(status: 'success' | 'error') {
		this.status = status;
	}
}

// eslint-disable-next-line @typescript-eslint/promise-function-async
const $quiet = (...properties: Parameters<typeof $>) => $(...properties).quiet();

type Callback<T> = ($: typeof $quiet, setLabel: Spinner['setLabel']) => Promise<T>;

export async function $spinner<T>(callback: Callback<T>, replaceConsole: boolean): Promise<T>;
export async function $spinner<T>(label: string, callback: Callback<T>, replaceConsole: boolean): Promise<T>;
export async function $spinner<T>(...arguments_: unknown[]): Promise<T> {
	let callback: Callback<T>;
	const spinner = new Spinner();

	if (typeof arguments_[0] === 'string') {
		spinner.setLabel(arguments_[0]);
		callback = arguments_[1] as Callback<T>;
	} else {
		callback = arguments_[0] as Callback<T>;
	}

	try {
		await spinner.start();
		const result: T = await callback($quiet, spinner.setLabel);
		spinner.setStatus('success');
		return result;
	} catch (error) {
		spinner.setStatus('error');
		spinner.setError(error);
	} finally {
		await spinner.stop();
	}
}