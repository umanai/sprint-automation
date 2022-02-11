"use strict";

import * as github from "@actions/github";
import { getLastPr, getRelatedPullRequests } from "./pulls";
import { getProject, updateProjectIssue } from "./projects";
import { getRelatedIssues } from "./issues";

const READY_TO_STAGE_FIELD = "Ready to Stage";
const READY_TO_VALIDATE_FIELD = "Ready to Validate";

export async function run(): Promise<void> {
  const ref = github.context.payload.ref;

  const READY_TO_STAGE_CONDITION = ref === "refs/heads/development";
  const READY_TO_VALIDATE_CONDITION = ref === "refs/heads/master";

  if (READY_TO_STAGE_CONDITION) {
    return readyToStage();
  }

  if (READY_TO_VALIDATE_CONDITION) {
    return readyToValidate();
  }

  console.error("Did not reach any conditions, exiting...");
  return;
}

async function readyToStage(): Promise<void> {
  const lastPr = await getLastPr("development", /#\d+ /gm);
  const lastPrId = lastPr.node_id;
  const relatedIssues = await getRelatedIssues(lastPrId);
  const project = await getProject(READY_TO_STAGE_FIELD);

  return updateProjectIssue(relatedIssues, project);
}

export async function readyToValidate(): Promise<void> {
  const lastPr = await getLastPr(
    "master",
    /#\d+ from umanai\/development/gm,
    true
  );

  const relatedPullRequests = await getRelatedPullRequests(lastPr.commits);

  relatedPullRequests.forEach(async (pr: any) => {
    const node_id = pr.node_id;
    const relatedIssues = await getRelatedIssues(node_id);
    const project = await getProject(READY_TO_VALIDATE_FIELD);

    return updateProjectIssue(relatedIssues, project);
  });
}
