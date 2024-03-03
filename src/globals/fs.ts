import fs from 'node:fs';

export async function isDirectory(path: string) {
	// Bun currently doesn't support checking directories,
	// This kind of works, but there are too many unknown unknowns:
	// Const file = Bun.file(path);
	// return file.size > 0 && file.type === 'application/octet-stream';
	return new Promise((resolve, reject) => {
		fs.stat(path, (error, stats) => {
			if (error) {
				if (error.code === 'ENOENT') {
					resolve(false);
				} else {
					reject(error);
				}
			} else {
				resolve(stats.isDirectory());
			}
		});
	});
}

export async function ensureDirectory(path: string) {
	if (!await isDirectory(path)) {
		fs.mkdir(path, { recursive: true }, error => {
			if (error) {
				console.error(error);
				throw new Error(`Couldn't create directory: ${path}`);
			}
		});
	}

	return true;
}


export function resolveTilde(input: string) {
	if (input.startsWith('~')) {
		return `${$HOME}${input.slice(1)}`;
	}

	return input;
}
