import { getRelatedIssues } from "./issues";
import { getProject, updateProjectIssue } from "./projects";
import { getLastPr, getPr } from "./pulls";

const READY_TO_VALIDATE_FIELD = "Ready to Validate";

export async function readyToValidate(): Promise<void> {
  const lastPr = await getLastPr(
    "master",
    /#\d+ from umanai\/development/gm,
    true
  );

  const relatedPullRequests = await getRelatedPullRequests(lastPr.commits);
  console.log(relatedPullRequests);
  relatedPullRequests.forEach(async (pr: any) => {
    const node_id = pr.node_id;
    const relatedIssues = await getRelatedIssues(node_id);
    console.log(relatedIssues);
    const project = await getProject(READY_TO_VALIDATE_FIELD);

    return updateProjectIssue(relatedIssues, project);
  });
}

async function getRelatedPullRequests(commits: any[]): Promise<any[]> {
  const pulls: any[] = [];
  commits
    .filter((commit) => /^Merge pull request #\d+ /.test(commit.commit.message))
    .forEach((commit) => {
      console.log(commit);
      const pullNumberMatches = commit.commit.message.match(/#\d+ /gm);
      const pullNumber = pullNumberMatches[0].split(" ")[0].replace(/#/, "");
      pulls.push(getPr(parseInt(pullNumber)));
    });
  console.log(pulls);
  return Promise.all(pulls);
}
