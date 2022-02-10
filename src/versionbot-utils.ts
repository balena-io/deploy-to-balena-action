import { debug } from '@actions/core';

import { getChecks } from './github-utils';
import { RepoContext } from './types';

const DEFAULT_SLEEP = 4000; // 4 seconds

const sleep = (milliseconds: number) => {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export async function getBranch(context: RepoContext): Promise<string> {
	if (!context.pullRequest) {
		throw new Error(
			`Cannot find Versionbot branch for non-PR context: ${JSON.stringify(
				context,
			)}`,
		);
	}
	// Look up checks for this commit
	const checks = await getChecks(context);
	// Find versionbot check
	const versionbot = checks.filter((check) => {
		return check.name.toLowerCase().includes('versionbot');
	})[0];
	// Check if versionbot has ran and is completed
	if (versionbot && versionbot.status === 'completed') {
		return `versionbot/pr/${context.pullRequest.number}`;
	}
	// Otherwise, wait for versionbot to complete
	debug('Versionbot check has not ran or completed yet.');
	debug(`Retrying in ${DEFAULT_SLEEP / 1000} seconds...`);
	// Sleep and retry
	await sleep(DEFAULT_SLEEP);
	// Try to get branch again
	return await getBranch(context);
}
