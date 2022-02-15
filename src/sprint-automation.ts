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

async function moveSingleIssue(
  branch: string = "development",
  status_field: string = READY_TO_STAGE_FIELD
): Promise<void> {
  const lastPr = await getLastPr(branch, /#\d+ /gm);
  const lastPrId = lastPr.node_id;
  const relatedIssues = await getRelatedIssues(lastPrId);
  const project = await getProject(status_field);

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

  const relatedPullRequests = await getRelatedPullRequests(lastPr.commits);

  relatedPullRequests.forEach(async (pr: any) => {
    const node_id = pr.node_id;
    const relatedIssues = await getRelatedIssues(node_id);
    const project = await getProject(status_field);

    return updateProjectIssue(relatedIssues, project);
  });
}
