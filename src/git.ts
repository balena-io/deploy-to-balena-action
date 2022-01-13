import { exec } from '@actions/exec';

export async function checkout(ref: string): Promise<void> {
	if ((await exec('git', ['checkout', ref])) !== 0) {
		throw new Error(`Failed to checkout ${ref} branch/commit.`);
	}
}

export async function fetch(): Promise<void> {
	if ((await exec('git', ['fetch'], { silent: true })) !== 0) {
		throw new Error(`Failed to fetch remote branches.`);
	}
}
