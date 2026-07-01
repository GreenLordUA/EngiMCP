import { getProjectStatus } from "../project/projectService.js";

const root = process.env.ENGIMCP_SMOKE_ROOT ?? `${process.cwd()}/examples/rc_car_project_stub`;

const status = await getProjectStatus({
  root,
  include_validation_summary: true,
  include_git_status: true
});

console.log(JSON.stringify(status, null, 2));
