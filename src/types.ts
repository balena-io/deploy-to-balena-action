export type Inputs = {
	fleet: string;
	source: string;
	environment: string;
	balenaToken: string;
	githubToken: string;
	cache: boolean;
	versionbot: boolean;
	createTag: boolean;
	layerCache: boolean;
	defaultBranch: string;
	multiDockerignore: boolean;
	debug: boolean;
	note: string;
	dockerfile: string;
};

export type RepoContext = {
	owner: string;
	name: string;
	sha: string;
	pullRequest: PullRequest | null;
};

export type PullRequest = {
	id: number;
	// eslint-disable-next-line id-denylist
	number: number;
	merged: boolean;
};

export type Release = {
	id: number;
	isFinal: boolean;
};
