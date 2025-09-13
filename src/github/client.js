import { Octokit } from '@octokit/rest';

export function createGitHubClient(token, baseUrl) {
  const octokit = new Octokit({ auth: token, baseUrl: baseUrl || undefined });
  return octokit;
}

