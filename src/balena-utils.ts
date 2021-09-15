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
				const msg = data.toString();
				// Using a single regex on each line is preferred but difficult with the colour codes that get sent in the logs
				if (msg.includes('Release:')) {
					releaseId = parseRelease(data.toString());
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
	// Send API request to finalize the release
	console.log(releaseId);
	return;
}

function parseRelease(log: string): string | null {
	const idIndex = log.indexOf('id: ');
	const match = log.substr(idIndex).match(/\d{7}/);
	return match ? match[0] : null;
}
