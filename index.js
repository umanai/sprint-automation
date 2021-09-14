const { Context } = require("@actions/github/lib/context");
const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const updateSection = require("update-section");

const START_LINE = "<!-- START prerelease-changelog -->";
const END_LINE = "<!-- END prerelease-changelog -->";

const getRegEx = (text) =>
  new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

const updateBody = (body, template) => {
  const parsedSection = updateSection.parse(
    body.split("\n"),
    (line) => getRegEx("<!-- START prerelease-changelog ").test(line),
    (line) => getRegEx("<!-- END prerelease-changelog ").test(line)
  );
  if (!parsedSection.hasStart) {
    return `${body}\n${START_LINE}\n${template}\n${END_LINE}`;
  }

  return updateSection(
    body,
    `${START_LINE}\n${template}\n${END_LINE}`,
    (line) => getRegEx("<!-- START prerelease-changelog ").test(line),
    (line) => getRegEx("<!-- END prerelease-changelog ").test(line)
  );
};

const execute = async (context) => {
  const inputs = {
    githubToken: core.getInput("github_token", { required: true }),
    prBody: core.getInput("pr_body"),
  };

  let prBody = context.payload.pull_request.body;
  if (prBody == undefined || prBody == null) {
    prBody = "";
  }

  const octokit = new Octokit({ auth: inputs.githubToken });
  const allCommits = [];

  const params = {
    ...context.repo,
    pull_number: context.payload.number,
    per_page: 50
  };
  for await (const response of octokit.paginate.iterator(
    octokit.rest.pulls.listCommits,
    params
  )) {
    const commits = response.data;
    commits.forEach((commit) => allCommits.push(commit));
  }

  const changelog = allCommits
    .filter((commit) => /^Merge pull request #\d+/.test(commit.commit.message))
    .map((commit) => {
      const splitMessage = commit.commit.message.split("\n");
      const message = splitMessage[splitMessage.length - 1];
      if (commit.author == undefined || commit.author == null) {
        return `* ${message}`;
      }
      return `* ${message} @${commit.author.login}`;
    })
    .join("\n");

  const template = `### Changelog\n${changelog}`;

  const newBody = updateBody(prBody, template);
  if (newBody != prBody) {
    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.number,
      body: newBody,
    });
  }
};

const run = async () => {
  const context = new Context();

  await execute(context);
};

run();
