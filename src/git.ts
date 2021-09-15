import { error } from '@actions/core';
import { exec } from '@actions/exec';

export async function checkout(ref: string): Promise<void> {
	if ((await exec('git', ['checkout', ref])) !== 0) {
		throw new Error(`Failed to checkout ${ref} branch/commit.`);
	}
}

export async function remoteHasBranch(branch: string): Promise<boolean> {
	let output = '';
	let errors = '';

	const options = {
		listeners: {
			stdout: (data: Buffer) => {
				output += data.toString();
			},
			stderr: (data: Buffer) => {
				errors += data.toString();
			},
		},
	};

	await exec('git', ['ls-remote', '--heads', 'origin', branch], options);
	if (errors.length > 0) {
		error(errors);
		throw new Error('Issue checking if remote has branch');
	}
	return output.length > 0;
}

export async function getOriginUrl(): Promise<string> {
	let output = '';
	let errors = '';

	const options = {
		listeners: {
			stdout: (data: Buffer) => {
				output += data.toString();
			},
			stderr: (data: Buffer) => {
				errors += data.toString();
			},
		},
	};

	await exec('git', ['config', '--get', 'remote.origin.url'], options);

	if (errors.length > 0) {
		error(errors);
		throw new Error('Issue getting remote.origin.url');
	}

	return output;
}
