import * as github from "@actions/github";
import * as core from "@actions/core";

export async function getLastPr(
  branch: string,
  messageRegex: RegExp,
  withCommits: boolean = true
): Promise<any> {
  const octokit = github.getOctokit(core.getInput("github_token"));

  const commitsResponse = await octokit.rest.repos.listCommits({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    sha: branch,
    per_page: 100,
  });

  if (commitsResponse.data.length === 0) {
    throw {
      name: "ValueError",
      message: `${branch} commit list cannot be empty`,
    };
  }

  const lastCommit = commitsResponse.data[0];
  if (lastCommit.sha != github.context.sha) {
    throw {
      name: "ValueError",
      message: "Last commit not retrieved correctly.",
    };
  }
  const pullNumberMatches = lastCommit.commit.message.match(messageRegex);
  if (pullNumberMatches === null || pullNumberMatches.length != 1) {
    throw {
      name: "ValueError",
      message: lastCommit.commit.message.includes("into development")
        ? "Can not automate master into development merge."
        : "Could not find correct amount of PR number matches for last commit.",
    };
  }

  const pullNumber = pullNumberMatches[0]
    .split(" ")[0]
    .replace(/ /g, "")
    .replace(/#/, "");

  const pullRequestParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: parseInt(pullNumber),
  };
  const pullRequest = await octokit.rest.pulls.get(pullRequestParams);
  const pullRequestData = pullRequest.data;

  if (!withCommits) return pullRequestData;

  const pullRequestCommits = await octokit.rest.pulls.listCommits(
    pullRequestParams
  );
  return { ...pullRequestData, commits: pullRequestCommits.data };
}
