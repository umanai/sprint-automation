import { run } from "./sprint-automation";

run().catch((error) => {
  console.error(error);
  throw error;
});
