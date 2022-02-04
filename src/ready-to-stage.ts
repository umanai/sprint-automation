"use strict";

import * as github from "@actions/github";
import * as core from "@actions/core";
import { Project } from "./util";

const READY_TO_STAGE_FIELD = "Ready to Stage";

export async function readyToStage(): Promise<void> {
  const lastPrId = await getLastPrId();
  const relatedIssues = await getRelatedIssues(lastPrId);
  const project = await getProject();

  return updateProjectIssue(relatedIssues, project);
}

async function getLastPrId(): Promise<string> {
  const commitsResponse = await github
    .getOctokit(core.getInput("github_token"))
    .rest.repos.listCommits({
      owner: "umanai",
      repo: core.getInput("repo_name"),
      sha: "development",
      per_page: 100,
    });

  if (commitsResponse.data.length === 0) {
    throw {
      name: "ValueError",
      message: "Development commits cannot be empty",
    };
  }

  const lastCommit = commitsResponse.data[0];
  if (lastCommit.sha != github.context.sha) {
    throw {
      name: "ValueError",
      message: "Last commit not retrieved correctly.",
    };
  }
  const pullNumberMatches = lastCommit.commit.message.match(/ #\d+ /gm);
  if (pullNumberMatches === null || pullNumberMatches.length != 1) {
    throw {
      name: "ValueError",
      message:
        "Could not find correct amount of PR number matches for last commit.",
    };
  }
  const pullNumber = pullNumberMatches[0].replace(/ /g, "").replace(/#/, "");
  const prResponse = await github
    .getOctokit(core.getInput("github_token"))
    .rest.pulls.get({
      owner: "umanai",
      repo: core.getInput("repo_name"),
      pull_number: parseInt(pullNumber),
    });
  return prResponse.data.node_id;
}

async function getRelatedIssues(pullRequestId: string): Promise<string[]> {
  const relatedIssuesQuery = `
        query ($pr_id: ID!) {
            node(id: $pr_id) {
                ... on PullRequest {
                    id
                    closingIssuesReferences(first: 100) {
                        nodes {
                            number
                            projectNextItems(first: 100) {
                                nodes {
                                    title
                                    id
                                }
                            }
                        }
                    }
                }
            }
        }`;
  const response: any = await github
    .getOctokit(core.getInput("github_token"))
    .graphql(relatedIssuesQuery, {
      pr_id: pullRequestId,
    });

  return response.node.closingIssuesReferences.nodes
    .map((node: any) =>
      node.projectNextItems.nodes.map((itemNode: { id: string }) => itemNode.id)
    )
    .flat();
}

async function getProjectIssueStatus(
  projectIssueFields: object[]
): Promise<{ fieldId: string; valueId: string }> {
  let result = null;
  projectIssueFields.forEach((field: any) => {
    if (field.name === "Status") {
      const settings = JSON.parse(field.settings);
      const statusOptions = settings.options;
      let valueId = "";
      statusOptions.forEach((option: any) => {
        if (option.name === READY_TO_STAGE_FIELD) valueId = option.id;
      });
      result = { fieldId: field.id, valueId };
    }
  });
  if (result === null) {
    throw {
      name: "NotFoundError",
      message: "Status property not found in project fields.",
    };
  }
  return result;
}

async function getProject(): Promise<Project> {
  const projectQuery = `
        query($organization: String!, $project_number: Int!) {
            organization(login: $organization){
                projectNext(number: $project_number) {
                    id
                    fields(first:20) {
                        nodes {
                            id
                            name
                            settings
                        }
                    }
                }
            }
        }`;
  const response: any = await github
    .getOctokit(core.getInput("github_token"))
    .graphql(projectQuery, {
      organization: "umanai",
      project_number: 1,
    });

  return {
    id: response.organization.projectNext.id,
    statusField: await getProjectIssueStatus(
      response.organization.projectNext.fields.nodes
    ),
  } as Project;
}

async function updateProjectIssue(
  issueIds: string[],
  project: Project
): Promise<void> {
  const projectIssueMutation = `
        mutation ($project_id: ID!, $item_id: ID!, $status_field_id: ID!, $status_value_id: String!) {
            set_status: updateProjectNextItemField(input: {
                projectId: $project_id
                itemId: $item_id
                fieldId: $status_field_id
                value: $status_value_id
            }) {
                projectNextItem {
                    id
                }
            }
        }`;

  return issueIds.forEach((issue) =>
    github
      .getOctokit(core.getInput("github_token"))
      .graphql(projectIssueMutation, {
        project_id: project.id,
        item_id: issue,
        status_field_id: project.statusField.fieldId,
        status_value_id: project.statusField.valueId,
      })
  );
}
