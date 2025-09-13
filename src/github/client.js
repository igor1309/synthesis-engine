export async function createGitHubClient(token, baseUrl) {
  const mod = await import('@octokit/rest').catch((e) => {
    const err = new Error("@octokit/rest is not installed");
    err.cause = e;
    throw err;
  });
  const { Octokit } = mod;
  const octokit = new Octokit({ auth: token, baseUrl: baseUrl || undefined });
  return octokit;
}
