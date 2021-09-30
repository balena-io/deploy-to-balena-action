import { debug } from '@actions/core';
import { exec } from '@actions/exec';

export async function push(
	fleet: string,
	source: string,
	draft: boolean = true,
): Promise<string> {
	let releaseId: string | null = null;
	const pushOpt = ['push', fleet, '--source', source];

	if (process.env.GITHUB_ACTIONS === 'false') {
		debug('Not pushing source to builders because action is false.');
		return '1234567'; // Do not actually build if this code is not being ran by Github
	}

	if (draft) {
		pushOpt.push('--draft');
	}

	await exec('balena', pushOpt, {
		listeners: {
			stdout: (data: Buffer) => {
				const msg = stripAnsi(data.toString());
				const match = msg.match(/\(id: (\d*)\)/);
				if (match) {
					releaseId = match[1];
				}
			},
		},
	});

	if (releaseId === null) {
		throw new Error('Was unable to find release ID from the build process.');
	}

	return releaseId;
}

export async function finalize(releaseId: string): Promise<void> {
	if ((await exec('balena', ['finalize', releaseId])) !== 0) {
		throw new Error(`Failed to finalize release ${releaseId}.`);
	}
}

function stripAnsi(logLine: string): string {
	return logLine.replace(
		/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
		'',
	);
}
