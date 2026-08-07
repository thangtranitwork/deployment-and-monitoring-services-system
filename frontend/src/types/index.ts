export interface ServiceConfig {
  enabled?: boolean;
  folder?: string;
  name: string;
  dev_cmd?: string;
  stg_cmd?: string;
  show_production?: boolean;
  prod_cmd?: string;
  dev_script?: string;
  stg_script?: string;
  prod_script?: string;
  has_dev?: boolean;
  has_stg?: boolean;
  has_prod?: boolean;
  prod_password_hash?: string;
  pre_deploy_cmd?: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  path: string;
  dev_agent_url?: string;
  stg_agent_url?: string;
  prod_agent_url?: string;
  pre_deploy_cmd?: string;
  services?: ServiceConfig[];
}

export interface Service {
  name: string;
  branch: string;
  last_commit: string;
  commit_time: string;
  commit_author: string;
  has_dev: boolean;
  has_stg: boolean;
  has_prod: boolean;
  cpu: string;
  memory: string;
  uptime: string;
  ports: string;
  dev_script?: string;
  stg_script?: string;
  prod_script?: string;
  tags?: string[];
  ahead?: number;
  behind?: number;
  ahead_staging?: number;
  behind_staging?: number;
  has_stash?: boolean;
  staged_changes?: number;
  has_staging?: boolean;
  unpushed?: boolean;
  path?: string;
}

export interface Settings {
  active_workspace_id: string;
  workspace_url: string;
  workspaces: WorkspaceItem[];
  user_name: string;
  git_bash_path: string;
  dev_agent_url: string;
  stg_agent_url: string;
  prod_agent_url: string;
  pre_deploy_cmd: string;
  services: ServiceConfig[];
}
