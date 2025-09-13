export async function createGitHubClient(token, baseUrl) {
  const mod = await import('@octokit/rest').catch((e) => {
    const err = new Error("@octokit/rest is not installed");
    err.cause = e;
    throw err;
  });
  const { Octokit } = mod;
  const timeout = Number(process.env.GITHUB_TIMEOUT || 10000);
  const octokit = new Octokit({
    auth: token,
    baseUrl: baseUrl || undefined,
    request: { timeout },
  });
  return octokit;
}
