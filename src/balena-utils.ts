import { exec } from '@actions/exec';

export async function push(
	fleet: string,
	source: string,
	draft: boolean = false,
): Promise<string> {
	let releaseId: string | null = null;
	const pushOpt = ['push', fleet, '--source', source];

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
	return;
}

function parseRelease(log: string): string | null {
	const idIndex = log.indexOf('id: ');
	const match = log.substr(idIndex).match(/\d{7}/);
	return match ? match[0] : null;
}
