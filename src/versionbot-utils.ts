import * as github from '@actions/github';
import { exec } from '@actions/exec';

export async function getBranch(): Promise<string> {
	// Below is the actual format versionbot uses
	// When this function runs it will have to check if the branch is ready
	// if not then wait and check agian..do this forever
	return 'versionbot/pr/1765';
}
