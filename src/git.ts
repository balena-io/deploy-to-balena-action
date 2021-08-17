import { exec } from '@actions/exec';

export async function checkout(repo: string, ref: string): Promise<void> {
	if ((await exec('git', ['checkout', `${repo}/${ref}`])) !== 0) {
		throw new Error(`Failed to checkout ${repo}/${ref}.`);
	}
}
