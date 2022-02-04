"use strict";

import * as github from "@actions/github";
import * as core from "@actions/core";
import { Project } from "./util";

const READY_TO_STAGE_FIELD = "Ready to Stage";

export async function readyToStage(): Promise<void> {
  const relatedIssues = await getRelatedIssues();
  console.log(relatedIssues);

  const project = await getProject();
  console.log(project);
}

async function getRelatedIssues(): Promise<string[]> {
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
      pr_id: github.context.payload.pull_request?.node_id,
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
  console.log("2");
  projectIssueFields.forEach((field: any) => {
    if (field.name === "Status") {
      const settings = JSON.parse(field.settings);
      const statusOptions = settings.options;
      let valueId = "";
      console.log("3");
      statusOptions.forEach((option: any) => {
        if (option.name === READY_TO_STAGE_FIELD) valueId = option.id;
      });
      return { fieldId: field.id, valueId };
    }
  });
  console.log("4");
  throw {
    name: "NotFoundError",
    message: "Status property not found in project fields.",
  };
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
  console.log("1");
  return {
    id: response.organization.projectNext.id,
    statusField: await getProjectIssueStatus(
      response.organization.projectNext.fields.nodes
    ),
  } as Project;

  //   echo 'PROJECT_ID='$(jq '.data.organization.projectNext.id' project_data.json) >> $GITHUB_ENV
  //   echo 'STATUS_FIELD_ID='$(jq '.data.organization.projectNext.fields.nodes[] | select(.name== "Status") | .id' project_data.json) >> $GITHUB_ENV
  //   echo 'IN_PROGRESS_OPTION_ID='$(jq '.data.organization.projectNext.fields.nodes[] | select(.name== "Status") |.settings | fromjson.options[] | select(.name=="In Progress") |.id' project_data.json) >> $GITHUB_ENV
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

  issueIds.forEach((issue) =>
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
