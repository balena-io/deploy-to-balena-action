import * as git from './git';
import { debug } from '@actions/core';

const DEFAULT_SLEEP = 4000; // 4 seconds

const sleep = (milliseconds: number) => {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export async function getBranch(pr: number): Promise<string> {
	const branch = `versionbot/pr/${pr}`;
	// Check if branch exists
	if (await git.remoteHasBranch(branch)) {
		return branch;
	} else {
		debug('Did not find branch.');
		debug(`Retrying in ${DEFAULT_SLEEP / 1000} seconds...`);
		// Sleep and retry
		await sleep(DEFAULT_SLEEP);
		return getBranch(pr);
	}
}
