export type Inputs = {
	fleet: string;
	release: number;
	environment: string;
	testCommand: string;
	testTimeout: number;
	balenaToken: string;
	githubToken: string;
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

