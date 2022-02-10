import { getLastPr } from "./shared";

const READY_TO_VALIDATE_FIELD = "Ready to Validate";

export async function readyToValidate(): Promise<void> {
  const lastPr = await getLastPr("master", /#\d+ from umanai\/development/gm);
  console.log(lastPr.commits);
  const lastPrId = lastPr.node_id;
  //   const relatedIssues = await getRelatedIssues(lastPrId);
  //   const project = await getProject();

  //   return updateProjectIssue(relatedIssues, project);
}
