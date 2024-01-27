import { PATHS } from "./config";
import { binfo } from "./sources"

function template(filename, path) {
	return `#!/bin/bash
  ${path}/${filename} $@
  `.split("\n").map(s => s.trim()).join("\n")
}


async function createBin(path, content) {
	await fs.ensureDir(PATHS.bins);
	await fs.writeFileSync(path, content, "utf8");
	await $`chmod +x ${path}`;
}


export async function getBins() {
	return await globby([`${PATHS.bins}/*`, `!${PATHS.bins}/bunshell`]);
}


export async function makeScriptExecutable({ filename, slug, bin, directory }) {
	if (argv.force === true && (await fs.pathExists(bin)) === true) {
		console.log(`\nRemoving ${chalk.bold(slug)} bin file\n${chalk.gray(`rm ${bin}`)}`)
		await $`rm ${bin}`
	}

	if (false !== await fs.pathExists(bin)) {
		return false;
	}
	const content = template(filename, directory);
	await createBin(bin, content);
	console.log(`Created new link: ${bin}`);
	return true;
}

export async function relinkBins() {
	let count = 0;
	for (const script of await binfo()) {
		if (await makeScriptExecutable(script)) {
			count++;
		}
	}
	return count > 0;
}