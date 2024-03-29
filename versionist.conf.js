'use strict';

const execSync = require('child_process').execSync;
const yaml = require('yaml');
const fs = require('fs');
const regex = /(docker:\/\/ghcr.io\/balena-io\/deploy-to-balena-action):.*/i;

const getAuthor = (commitHash) => {
  return execSync(`git show --quiet --format="%an" ${commitHash}`, {
    encoding: 'utf8'
  }).replace('\n', '');
};

const isIncrementalCommit = (changeType) => {
  return Boolean(changeType) && changeType.trim().toLowerCase() !== 'none';
};

module.exports = {
  // This setup allows the editing and parsing of footer tags to get version and type information,
  // as well as ensuring tags of the type 'v<major>.<minor>.<patch>' are used.
  // It increments in a semver compatible fashion and allows the updating of NPM package info.
  editChangelog: true,
  parseFooterTags: true,
  getGitReferenceFromVersion: 'v-prefix',
  incrementVersion: 'semver',
  updateVersion: (cwd, version, callback) => {
    const packageFile = `${cwd}/package.json`;
    const packageData = require(packageFile);
    packageData.version = version;
    fs.writeFileSync(packageFile, JSON.stringify(packageData, null, 2));
    const packageLockFile = `${cwd}/package-lock.json`;
    const packageLockData = require(packageLockFile);
    packageLockData.version = version;
    packageLockData.packages[""].version = version;
    fs.writeFileSync(packageLockFile, JSON.stringify(packageLockData, null, 2) + '\n');
    const actionYml = `${cwd}/action.yml`;
    const action = yaml.parse(fs.readFileSync(actionYml, 'utf8'));
    action.runs.image = action.runs.image.replace(regex, `$1:v${version}`);
    fs.writeFileSync(actionYml, yaml.stringify(action));
  },

  // Always add the entry to the top of the Changelog, below the header.
  addEntryToChangelog: {
    preset: 'prepend',
    fromLine: 6
  },

  // Only include a commit when there is a footer tag of 'change-type'.
  // Ensures commits which do not up versions are not included.
  includeCommitWhen: (commit) => {
    return isIncrementalCommit(commit.footer['change-type']);
  },

  // Determine the type from 'change-type:' tag.
  // Should no explicit change type be made, then no changes are assumed.
  getIncrementLevelFromCommit: (commit) => {
    if (isIncrementalCommit(commit.footer['change-type'])) {
      return commit.footer['change-type'].trim().toLowerCase();
    }
  },

  // If a 'changelog-entry' tag is found, use this as the subject rather than the
  // first line of the commit.
  transformTemplateData: (data) => {
    data.commits.forEach((commit) => {
      commit.subject = commit.footer['changelog-entry'] || commit.subject;
      commit.author = getAuthor(commit.hash);
    });

    return data;
  },

  template: [
    '## v{{version}} - {{moment date "Y-MM-DD"}}',
    '',
    '{{#each commits}}',
    '{{#if this.author}}',
    '* {{capitalize this.subject}} [{{this.author}}]',
    '{{else}}',
    '* {{capitalize this.subject}}',
    '{{/if}}',
    '{{/each}}'
  ].join('\n')
};
