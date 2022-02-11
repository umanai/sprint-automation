import * as github from "@actions/github";
import { getTransport } from "./util";

export async function getPr(number: number): Promise<any> {
  const response = await getTransport().rest.pulls.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: number,
  });

  return response.data;
}

export async function getLastPr(
  branch: string,
  messageRegex: RegExp,
  withCommits: boolean = false
): Promise<any> {
  const commitsResponse = await getTransport().rest.repos.listCommits({
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

  const pullNumber = pullNumberMatches[0].split(" ")[0].replace(/#/, "");

  const pullRequestParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: parseInt(pullNumber),
  };
  const pullRequest = await getTransport().rest.pulls.get(pullRequestParams);
  const pullRequestData = pullRequest.data;

  if (!withCommits) return pullRequestData;

  const pullRequestCommits: any[] = [];
  for await (const response of getTransport().paginate.iterator(
    getTransport().rest.pulls.listCommits,
    pullRequestParams
  )) {
    const commitData = response.data;
    commitData.forEach((c: any) => pullRequestCommits.push(c));
  }

  return { ...pullRequestData, commits: pullRequestCommits };
}

export async function getRelatedPullRequests(commits: any[]): Promise<any[]> {
  const pulls: any[] = [];
  commits
    .filter((commit) => /^Merge pull request #\d+ /.test(commit.commit.message))
    .forEach((commit) => {
      const pullNumberMatches = commit.commit.message.match(/#\d+ /gm);
      const pullNumber = pullNumberMatches[0].split(" ")[0].replace(/#/, "");
      pulls.push(getPr(parseInt(pullNumber)));
    });

  return Promise.all(pulls);
}
