export type RabbitCommandType =
  | 'DEPLOY_SERVICE'
  | 'GET_SERVICE_STATUS'
  | 'LIST_SERVICES'
  | 'GIT_PULL'
  | 'GIT_CHECKOUT'
  | 'GIT_STATUS'
  | 'GET_SYSTEM_STATS'
  | 'GET_DEPLOYMENT_LOGS'
  | 'ROLLBACK_DEPLOYMENT'
  | 'CHECK_AND_DEPLOY'
  | 'NEED_CLARIFICATION'
  | 'UNKNOWN';

export interface RabbitCommandPayload {
  service?: string;
  services?: string[];
  environment?: string;
  branch?: string;
  deployment_id?: string;
  question?: string;
  candidates?: string[];
  reason?: string;
  confirm_production?: boolean;
}

export interface RabbitCommand {
  type: RabbitCommandType;
  payload: RabbitCommandPayload;
  bunny_message: string;
  requires_confirmation?: boolean;
}
