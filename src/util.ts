import * as github from "@actions/github";
import * as core from "@actions/core";

export interface Project {
  id: string;
  statusField: {
    fieldId: string;
    valueId: string;
  };
}

export function getTransport() {
  return github.getOctokit(core.getInput("github_token"));
}
