import { getProjectStatus } from "../project/projectService.js";

const status = await getProjectStatus({
  root: process.cwd(),
  include_validation_summary: true,
  include_git_status: true
});

console.log(JSON.stringify(status, null, 2));
