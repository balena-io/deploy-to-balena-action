export type Inputs = {
	fleet: string;
	source: string;
	environment: string;
	balenaToken: string;
	githubToken: string;
	cache: boolean;
	versionbot: boolean;
	createTag: boolean;
};

export type RepoContext = {
	owner: string;
	name: string;
	sha: string;
	pullRequest: PullRequest | null;
};

export type PullRequest = {
	id: number;
	number: number;
	merged: boolean;
};

export type Release = {
	id: number;
	isFinal: boolean;
};
