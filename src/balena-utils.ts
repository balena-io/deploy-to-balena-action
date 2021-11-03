import * as core from '@actions/core';
import { exec } from '@actions/exec';
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
		...options,
		...DEFAULT_BUILD_OPTIONS,
	} as BuildOptions;

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

export async function getReleaseByTags(
	slug: string,
	tags: Tags,
): Promise<Release> {
	core.debug(
		`Getting releases for ${slug} fleet with tags: { balena-ci-id: ${tags.pullRequestId!}, balena-ci-commit-sha: ${
			tags.sha
		} }`,
	);

	await balena.auth.loginWithToken(
		core.getInput('balena_token', { required: true }),
	);

	const application = await balena.models.release.getAllByApplication(
		core.getInput('fleet', { required: true }),
		{
			$top: 1,
			$select: ['id', 'is_final'],
			$filter: {
				status: 'success',
				$and: [
					{
						release_tag: {
							$any: {
								$alias: 'rt',
								$expr: {
									rt: {
										tag_key: 'balena-ci-id',
										value: tags.pullRequestId!,
									},
								},
							},
						},
					},
					{
						release_tag: {
							$any: {
								$alias: 'rt',
								$expr: {
									rt: {
										tag_key: 'balena-ci-commit-sha',
										value: tags.sha,
									},
								},
							},
						},
					},
				],
			},
			$orderby: { created_at: 'desc' },
		},
	);

	if (application.length !== 1) {
		throw new Error(
			`Expected 1 release to be returned but got ${application.length}`,
		);
	}

	return {
		id: application[0].id.toString(),
		isFinal: application[0].is_final,
	};
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
