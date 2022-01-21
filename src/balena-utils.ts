import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { spawn } from 'child_process';
import { getSdk } from 'balena-sdk';

type Release = {
	id: string;
	isFinal: boolean;
};

type Tags = {
	sha: string;
	pullRequestId?: string;
};

type BuildOptions = {
	draft: boolean;
	tags: Tags;
};

const DEFAULT_BUILD_OPTIONS: Partial<BuildOptions> = {
	draft: true,
};

const balena = getSdk({
	apiUrl: `https://api.${core.getInput('environment', { required: false })}/`,
});

export async function push(
	fleet: string,
	source: string,
	options: Partial<BuildOptions>,
): Promise<string> {
	if (process.env.GITHUB_ACTIONS === 'false') {
		core.debug('Not pushing source to builders because action is false.');
		return '1910442'; // Do not actually build if this code is not being ran by Github
	}

	const buildOpt = {
		...DEFAULT_BUILD_OPTIONS,
		...options,
	} as BuildOptions;

	// Check if we want to use a cache release
	if (core.getBooleanInput('cache', { required: false })) {
		core.info('Checking if a release has already been built.');
		const tags: Tags = {
			sha: buildOpt.tags.sha,
			pullRequestId: buildOpt.tags.pullRequestId,
		};
		try {
			const cachedRelease = await getReleaseByTags(fleet, tags);
			core.info('Found existing release.');
			// Found an existing release matching this SHA
			return cachedRelease.id;
		} catch (e: any) {
			if (e.message !== 'Did not find any matching releases') {
				throw e;
			}
			// Release was not found so continue to build
			core.info('Did not find existing release so building a new one.');
		}
	}

	const pushOpt = [
		'push',
		fleet,
		'--source',
		source,
		'--release-tag',
		'balena-ci-commit-sha',
		buildOpt.tags.sha,
	];

	if (buildOpt.tags.pullRequestId) {
		pushOpt.push('balena-ci-id');
		pushOpt.push(buildOpt.tags.pullRequestId);
	}

	if (buildOpt.draft) {
		pushOpt.push('--draft');
	}

	let releaseId: string | null = null;

	return new Promise((resolve, reject) => {
		core.debug(`balena ${pushOpt.join(' ')}`);

		const buildProcess = spawn('balena', pushOpt, {
			stdio: 'pipe',
		});

		buildProcess.stdout.setEncoding('utf8');

		buildProcess.stdout.on('data', (data: Buffer) => {
			const msg = stripAnsi(data.toString());
			core.info(msg);
			const match = msg.match(/Release: .{32} \(id: (\d*)\)/);
			if (match) {
				releaseId = match[1];
			}
		});

		buildProcess.stderr.on('data', (data: Buffer) => {
			core.error(stripAnsi(data.toString()));
		});

		process.on('SIGTERM', () => {
			buildProcess.kill('SIGINT');
		});

		process.on('SIGINT', () => {
			buildProcess.kill('SIGINT');
		});

		buildProcess.on('exit', () => {
			core.info('Build process exit');
			if (releaseId) {
				resolve(releaseId);
			} else {
				reject('Was unable to find release ID from the build process.');
			}
		});
	});
}

export async function getReleaseByTags(
	slug: string,
	tags: Tags,
): Promise<Release> {
	core.debug(
		`Getting Release for ${slug} fleet with Tag values: ${JSON.stringify(
			tags,
		)}`,
	);

	await balena.auth.loginWithToken(
		core.getInput('balena_token', { required: true }),
	);
	// Filters on commit SHA tag
	const shaFilter = {
		$any: {
			$alias: 'rt',
			$expr: {
				rt: {
					tag_key: 'balena-ci-commit-sha',
					value: tags.sha,
				},
			},
		},
	};
	// Filters on Pull Request ID
	const idFilter = {
		$any: {
			$alias: 'rt',
			$expr: {
				rt: {
					tag_key: 'balena-ci-id',
					value: tags.pullRequestId!,
				},
			},
		},
	};
	// If a PR ID is passed in the tags then filter on that and SHA
	const filter = tags.pullRequestId
		? {
				status: 'success',
				$and: [{ release_tag: idFilter }, { release_tag: shaFilter }],
		  }
		: {
				status: 'success',
				release_tag: shaFilter,
		  };
	const application = await balena.models.release.getAllByApplication(
		core.getInput('fleet', { required: true }),
		{
			$top: 1,
			$select: ['id', 'is_final'],
			$filter: filter,
			$orderby: { created_at: 'desc' },
		},
	);

	if (application.length !== 1) {
		throw new Error('Did not find any matching releases');
	}

	return {
		id: application[0].id.toString(),
		isFinal: application[0].is_final,
	};
}

// https://www.balena.io/docs/reference/sdk/node-sdk/#balena.models.release.get
export async function getReleaseVersion(releaseId: number): Promise<string> {
	core.debug(`Getting version for release ID ${releaseId}`);

	await balena.auth.loginWithToken(
		core.getInput('balena_token', { required: true }),
	);

	const release = await balena.models.release.get(releaseId, {
		$select: 'raw_version',
	});

	if (!release.raw_version) {
		throw new Error(`Release raw_version returned empty!`);
	}

	core.debug(`Release version is ${release.raw_version}`);

	return release.raw_version;
}

export async function finalize(releaseId: string): Promise<void> {
	if ((await exec('balena', ['release', 'finalize', releaseId])) !== 0) {
		throw new Error(`Failed to finalize release ${releaseId}.`);
	}
}

function stripAnsi(logLine: string): string {
	return logLine.replace(
		/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
		'',
	);
}
