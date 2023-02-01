"use strict";

import * as github from "@actions/github";
import * as core from "@actions/core";
import { getLastPr, getRelatedPullRequests } from "./pulls";
import { getProject, updateProjectIssue } from "./projects";
import { getRelatedIssues } from "./issues";

const READY_TO_STAGE_FIELD = "Ready to Stage";
const READY_TO_VALIDATE_FIELD = "Ready to Validate";

export async function run(): Promise<void> {
  const ref = github.context.payload.ref;

  const DEVELOPMENT_BRANCH = ref === "refs/heads/development";
  const MASTER_BRANCH = ref === "refs/heads/master";

  if (DEVELOPMENT_BRANCH) {
    return moveSingleIssue();
  }

  const update_pr_commits = core.getInput("update_pr_commits") === "true";
  if (MASTER_BRANCH && !update_pr_commits) {
    return moveSingleIssue("master", READY_TO_VALIDATE_FIELD);
  }

  if (MASTER_BRANCH && update_pr_commits) {
    return moveMultipleIssues();
  }

  console.error("Did not reach any conditions, exiting...");
  return;
}

function prettyObject(obj: any): string {
  return JSON.stringify(obj, null, 4);
}

async function moveSingleIssue(
  branch: string = "development",
  status_field: string = READY_TO_STAGE_FIELD
): Promise<void> {
  const lastPr = await getLastPr(branch, /#\d+ /gm);
  const lastPrId = lastPr.node_id;

  console.log("Getting related issues for PR: " + lastPrId);
  const relatedIssues = await getRelatedIssues(lastPrId);
  console.log("Related issues: " + relatedIssues);

  const project = await getProject(status_field);

  console.log("Updating project issues: " + relatedIssues);
  return updateProjectIssue(relatedIssues, project);
}

export async function moveMultipleIssues(
  branch: string = "master",
  status_field: string = READY_TO_VALIDATE_FIELD
): Promise<void> {
  const lastPr = await getLastPr(
    branch,
    /#\d+ from umanai\/development/gm,
    true
  );

  console.log(
    "Getting related PRs for commits: " + prettyObject(lastPr.commits)
  );
  const relatedPullRequests = await getRelatedPullRequests(lastPr.commits);
  console.log("Related PRs: " + prettyObject(relatedPullRequests));

  relatedPullRequests.forEach(async (pr: any) => {
    const node_id = pr.node_id;
    console.log("Getting related issues for PR: " + node_id);
    const relatedIssues = await getRelatedIssues(node_id);
    console.log("Related issues: " + relatedIssues);

    const project = await getProject(status_field);

    console.log("Updating project issues: " + relatedIssues);
    return updateProjectIssue(relatedIssues, project);
  });
}
