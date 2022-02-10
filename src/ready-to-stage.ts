"use strict";

import { getLastPr } from "./pulls";
import { getProject, updateProjectIssue } from "./projects";
import { getRelatedIssues } from "./issues";

const READY_TO_STAGE_FIELD = "Ready to Stage";

export async function readyToStage(): Promise<void> {
  const lastPr = await getLastPr("development", /#\d+ /gm);
  const lastPrId = lastPr.node_id;
  const relatedIssues = await getRelatedIssues(lastPrId);
  const project = await getProject(READY_TO_STAGE_FIELD);

  return updateProjectIssue(relatedIssues, project);
}
