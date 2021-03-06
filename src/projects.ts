import { getTransport, Project } from "./util";

export async function getProjectIssueStatus(
  projectIssueFields: object[],
  targetField: string
): Promise<{ fieldId: string; valueId: string }> {
  let result = null;
  projectIssueFields.forEach((field: any) => {
    if (field.name === "Status") {
      const settings = JSON.parse(field.settings);
      const statusOptions = settings.options;
      let valueId = "";
      statusOptions.forEach((option: any) => {
        if (option.name === targetField) valueId = option.id;
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

export async function getProject(targetField: string): Promise<Project> {
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
  const response: any = await getTransport().graphql(projectQuery, {
    organization: "umanai",
    project_number: 1,
  });

  return {
    id: response.organization.projectNext.id,
    statusField: await getProjectIssueStatus(
      response.organization.projectNext.fields.nodes,
      targetField
    ),
  } as Project;
}

export async function updateProjectIssue(
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
    getTransport().graphql(projectIssueMutation, {
      project_id: project.id,
      item_id: issue,
      status_field_id: project.statusField.fieldId,
      status_value_id: project.statusField.valueId,
    })
  );
}
