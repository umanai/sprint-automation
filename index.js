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
    getRegEx("<!-- START prerelease-changelog "),
    getRegEx("<!-- END prerelease-changelog ")
  );
  if (!parsedSection.hasStart) {
    return `${body}\n${START_LINE}\n${template}\n${END_LINE}`;
  }

  return updateSection(body, `${START_LINE}\n${template}\n${END_LINE}`);
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

  const { data } = await octokit.rest.pulls.listCommits({
    ...context.repo,
    pull_number: context.payload.number,
  });

  const changelog = data
    .filter((commit) => /^Merge pull request #\d+/.test(commit.commit.message))
    .map((commit) => {
      if (commit.author == undefined || commit.author == null) {
        return `* ${commit.commit.message}`;
      }
      return `* ${commit.commit.message} @${commit.author.login}`;
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
