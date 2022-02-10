"use strict";

import * as github from "@actions/github";
import { readyToStage } from "./ready-to-stage";
import { readyToValidate } from "./ready-to-validate";

export async function run(): Promise<void> {
  const ref = github.context.payload.ref;

  const READY_TO_STAGE_CONDITION = ref === "refs/heads/development";
  const READY_TO_VALIDATE_CONDITION = ref === "refs/heads/master";

  if (READY_TO_STAGE_CONDITION) {
    return readyToStage();
  }

  if (READY_TO_VALIDATE_CONDITION) {
    return readyToValidate();
  }

  console.error("Did not reach any conditions, exiting...");
  return;
}
