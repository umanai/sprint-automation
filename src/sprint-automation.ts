"use strict";

import * as github from "@actions/github";
import { readyToStage } from "./ready-to-stage";

export async function run(): Promise<void> {
  const baseRef = github.context.payload.pull_request?.base.ref;
  const headRef = github.context.payload.pull_request?.head.ref;

  const READY_TO_STAGE_CONDITION =
    baseRef === "development" && headRef != "master";
  const READY_TO_VALIDATE_CONDITION =
    baseRef === "master" && headRef === "development";

  if (READY_TO_STAGE_CONDITION) {
    return readyToStage();
  }

  if (READY_TO_VALIDATE_CONDITION) {
    throw {
      name: "NotImplementedError",
      message: "readyToValidate does not exist.",
    };
  }

  console.error("Did not reach any conditions, exiting...");
  return;
}
