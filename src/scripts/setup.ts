import * as config from '../lib/config';
import {addSourceDirectory} from './link';

export const desc = 'Install bunism and set up your environment';
export const usage = 'bunism install';

async function require<T>(callback: () => Promise<T>, attempts = 3): Promise<T> {
	while (attempts > 0) {
		try {
			return await callback();
		} catch (error) {
			if (error instanceof Error) {
				console.log(error.message);
			} else {
				console.log(error);
			}
		}

		attempts--;
	}

	throw new Exit('Failed to complete operation. Exiting.');
}

async function availableRcFiles() {
	const rcFiles = [`${$HOME}/.zshrc`, `${$HOME}/.bashrc`, `${$HOME}/.profile`, `${$HOME}/.bash_profile`];
	return Promise.all(rcFiles.filter(async f => Bun.file(f).exists()));
}

async function setupBinaryPath(binaryPath: string) {
	const rcFiles = await availableRcFiles();

	const select = [...rcFiles, 'Custom'];
	let rcFile = selection(select, 'Which file would you like to add bunism to?');

	if (rcFile === 'Custom') {
		const customFile = await require(async () => {
			const file = prompt('Enter the path to the file you\'d like to add bunism to:');
			if (!file) {
				throw new Exit('No file path provided');
			}

			if (!await Bun.file(file).exists()) {
				throw new Exit(`File not found: ${file}`);
			}

			return file;
		});
		rcFile = customFile;
	}

	const rcContent = await Bun.file(rcFile).text();

	if (!rcContent.includes(binaryPath)) {
		await Bun.write(rcFile, `${rcContent}\nexport PATH="${binaryPath}:$PATH"\n`);
	}
}

async function displayWelcomeMessage() {
	const dimLine = ansis.dim('===============================================================');
	const message = `
	${dimLine}
	 Welcome to ${ansis.bold('bunism')}!
	${dimLine}
	
	 Reload the terminal and run ${ansis.bold('bunism')} to finish the setup process.
	
	 Some useful commands to get you started:
	 • ${ansis.bold('bunism help')} 			get the full list of available commands
	 • ${ansis.bold('bunism new my-script')} 	create your first script
	 • ${ansis.bold('bunism list')} 			see a list of scripts you've defined.

	 ${dimLine}`;

	console.log(message.replaceAll(/^\t/gm, '|'));
}

async function setupConfig(bmPath: string) {
	const configFile = `${bmPath}/config.json`;
	if (await Bun.file(configFile).exists()) {
		return;
	}

	const defaultExtension = selection<config.SupportedFiles>([...config.SUPPORTED_FILES], 'What file extension would you like to use for your scripts?');
	const defaults: config.Config = {
		extension: defaultExtension,
	};
	await config.set(defaults);
}

export async function uninstall() {
	const confirm = ack('Are you sure you want to uninstall bunism?');
	if (!confirm) {
		return;
	}

	const rcFiles = await availableRcFiles();
	const binaryPath = `${$HOME}/.bunism/bin`;

	for (const file of rcFiles) {
		const content = await Bun.file(file).text();
		if (content.includes(binaryPath)) {
			await Bun.write(file, content.replace(`export PATH="${binaryPath}:$PATH"\n`, ''));
			console.log(`\n- Removed ${binaryPath} from ${file}`);
		}
	}

	cd($HOME);
	await $`rm -rf ${$HOME}/.bunism`;
	throw new Exit('Uninstalled bunism.');
}

export default async function setup() {
	if (argv.remove || argv.uninstall || argv._[0] === 'remove' || argv._[0] === 'uninstall') {
		await uninstall();
		return;
	}

	console.log(`\nInstalling ${ansis.bold('bunism')}...\n`);
	if (!Bun.env.PATH) {
		throw new Exit('Can\'t find $PATH variable. Exiting.');
	}

	const bunism = await $`which bunism`.quiet().text();
	if (bunism.trim() === '') {
		console.log('bunism is already installed globally.');
	} else {
		console.log('Installing bunism globally...');
		await $`bun install -g bunism`;
	}

	console.log('\n- Setting up the necessary paths for bunism scripts to run.');
	const bmPath = `${$HOME}/.bunism`;
	const binaryPath = path.join(bmPath, 'bin');
	if (!Bun.env.PATH.includes(bmPath)) {
		await setupBinaryPath(binaryPath);
	}

	console.log('\n- Setting up the bunism config file.');
	await ensureDirectory(binaryPath);
	await setupConfig(bmPath);

	console.log('\n- Setting up the script source directory.');
	if (await config.get('sources') === undefined) {
		await addSourceDirectory();
	}

	const bmAliasBinary = `${binaryPath}/bm`;
	const bmAliasQuestion = `\n- Do you want to setup ${ansis.bold('bm')} as a shortcut for ${ansis.bold('bunism')}?`;
	if (!await Bun.file(bmAliasBinary).exists() && Bun.which('bm') === null && ack(bmAliasQuestion)) {
		await Bun.write(`${bmAliasBinary}`, '#!/bin/bash\nbunism $@');
		await $`chmod +x ${bmAliasBinary}`;
		console.log(`\n- Created a new bin: ${ansis.bold('bm')} -> ${bmAliasBinary} \n`);
	}

	// Welcome!
	await displayWelcomeMessage();

	console.log(`\n- Open a new terminal to reload your ${ansis.bold('$PATH')} variable to apply the changes.`);
}
