import * as core from "@actions/core";
import { context as contextType } from "@actions/github";

import * as versionbot from "./versionbot-utils";
import * as balena from "./balena-utils";
import * as git from "./git";
import * as github from "./github-utils";
import { Inputs, RepoContext } from "./types";

const ALLOWED_EVENTS = ["pull_request_target", "pull_request", "workflow_dispatch"];

export async function run(
	context: typeof contextType,
	inputs: Inputs
): Promise<void> {
	// If the payload does not have a repository object then fail early (the events we are interested in always have this)
	if (!context.payload.repository) {
		throw new Error("Workflow payload was missing repository object");
	}

	// Get the master branch so we can infer intent
	const target =
		inputs.defaultBranch || context.payload.repository.master_branch;
	// Collect repo context
	const repoContext: RepoContext = {
		owner: context.payload.repository.owner.login || "",
		name: context.payload.repository.name || "",
		sha: context.payload.pull_request?.head.sha || context.sha,
		pullRequest: context.payload.pull_request
			? {
					id: context.payload.pull_request.id,
					number: context.payload.pull_request.number,
					merged: context.payload.pull_request.merged,
			  }
			: null,
	};

	// ID of release built
	let releaseId: number | null = null;
	// Version of release built
	let rawVersion: string | null = null;

	if (context.payload.action === "closed") {
		// If a pull request was closed and merged then just finalize the release!
		if (repoContext.pullRequest && repoContext.pullRequest.merged) {
			// Get the previous release built
			const previousRelease = await balena.getReleaseByTags(inputs.fleet, {
				sha: repoContext.sha,
				pullRequestId: repoContext.pullRequest.id,
			});
			if (!previousRelease) {
				throw new Error(
					"Action reached point of finalizing a release but did not find one"
				);
			} else if (previousRelease.isFinal) {
				core.info("Release is already finalized so skipping.");
				return;
			}

			// Finalize release!
			await balena.finalize(previousRelease.id);

			rawVersion = await balena.getReleaseVersion(previousRelease.id);

			// set outputs on finalize
			core.setOutput("version", rawVersion);
			core.setOutput("release_id", previousRelease.id);

			if (inputs.createTag && rawVersion) {
				try {
					await github.createTag(repoContext, rawVersion);
				} catch (e: any) {
					if (e.message !== "Reference already exists") {
						throw e;
					}
					core.info("Git reference already exists.");
					return;
				}
			}

			return;
		} else {
			// If the pull request was closed but not merged then do nothing
			core.info("Pull request was closed but not merged, nothing to do.");
			return;
		}
	}

	// If the repository uses Versionbot then checkout Versionbot branch
	if (inputs.versionbot) {
		const versionbotBranch = await versionbot.getBranch(repoContext);
		// This will checkout the branch to the `GITHUB_WORKSPACE` path
		await git.fetch(); // fetch remote branches first
		await git.checkout(versionbotBranch);
	}

	let buildOptions = null;

	// If we are pushing directly to the target branch then just build a release without draft flag
	if (
		context.eventName === "push" &&
		(context.ref === `refs/heads/${target}` ||
			context.ref.startsWith("refs/tags/"))
	) {
		// TODO: Update this to use ref_type & ref_name once that becomes available
		// See: https://github.com/actions/toolkit/pull/935/files
		const tagName = context.ref.match(/^refs\/tags\/(.+)$/)?.[1];
		// Make a final release because context is master workflow
		buildOptions = {
			draft: false,
			tags: {
				sha: context.sha,
				...(!!tagName && { tag: tagName }),
			},
		};
	} else if (!ALLOWED_EVENTS.includes(context.eventName)) {
		// Make sure the only events now are ones we expect
		if (context.eventName === "push") {
			throw new Error(
				`Push workflow only works with ${target} branch. Event tried pushing to: ${context.ref}`
			);
		}
		throw new Error(`Unsure how to proceed with event: ${context.eventName}`);
	} else {
		// TODO: Update this to use ref_type & ref_name once that becomes available
		// See: https://github.com/actions/toolkit/pull/935/files
		const tagName = context.ref.match(/^refs\/tags\/(.+)$/)?.[1];
		// Make a final release because context is master workflow
		buildOptions = {
			draft: false,
			tags: {
				sha: context.sha,
				...(!!tagName && { tag: tagName }),
			},
		};
	}

	// Finally send source to builders
	try {
		releaseId = await balena.push(inputs.fleet, inputs.source, inputs.cache, {
			...buildOptions,
			noCache: inputs.layerCache === false,
			multiDockerignore: inputs.multiDockerignore,
		});
	} catch (e: any) {
		core.error(e.message);
		throw e;
	}

	// Now that we built a release set the expected outputs
	rawVersion = await balena.getReleaseVersion(releaseId);
	core.setOutput("version", rawVersion);
	core.setOutput("release_id", releaseId);

	if (inputs.createTag && buildOptions.draft === false) {
		try {
			await github.createTag(repoContext, rawVersion);
		} catch (e: any) {
			if (e.message !== "Reference already exists") {
				throw e;
			}
			core.info("Git reference already exists.");
		}
	}
}
