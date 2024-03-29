import { getTransport } from "./util";

export async function getRelatedIssues(
  pullRequestId: string
): Promise<string[]> {
  const relatedIssuesQuery = `
            query ($pr_id: ID!) {
                node(id: $pr_id) {
                    ... on PullRequest {
                        id
                        closingIssuesReferences(first: 100) {
                            nodes {
                                number
                                projectItems(first: 100) {
                                    nodes {
                                        id
                                    }
                                }
                            }
                        }
                    }
                }
            }`;
  const response: any = await getTransport().graphql(relatedIssuesQuery, {
    pr_id: pullRequestId,
  });

  return response.node.closingIssuesReferences.nodes
    .map((node: any) =>
      node.projectItems.nodes.map((itemNode: { id: string }) => itemNode.id)
    )
    .flat();
}
