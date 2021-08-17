import * as github from '@actions/github';
import { exec } from '@actions/exec';

export async function getBranch(): Promise<string> {
	return 'repo/versionbot-1-0-0';
}
