import { VoiceCommandResult } from '../components/mascot/hooks/useVoiceCommand';

export type UIIntentType =
  | 'OPEN_DEPLOYMENT_TERMINAL'
  | 'OPEN_MULTI_DEPLOY_MODAL'
  | 'SHOW_PROD_CONFIRMATION'
  | 'SHOW_GIT_STATUS'
  | 'SELECT_SERVICE'
  | 'SHOW_SYSTEM_STATS'
  | 'NO_ACTION';

export interface UIIntentAction {
  type: UIIntentType;
  serviceName?: string;
  services?: string[];
  environment?: string;
  deploymentId?: string;
  message?: string;
  rawResult?: any;
}

export function resolveUIIntent(result: VoiceCommandResult): UIIntentAction {
  console.log('🔍 [UIIntentResolver] Resolving raw MCP voice result:', result);

  if (!result) {
    console.log('🔍 [UIIntentResolver] Null result -> NO_ACTION');
    return { type: 'NO_ACTION' };
  }

  // Extract from command payload if available
  const cmdPayload = result.command?.payload;
  const cmdType = result.command?.type;

  // 1. Production Confirmation Gate Required
  if (result.requires_confirmation || result.action_type === 'confirm_required' || result.result?.code === 'CONFIRMATION_REQUIRED') {
    const svc = cmdPayload?.service || (cmdPayload?.services ? cmdPayload.services.join(', ') : '') || result.params?.service_name || result.result?.service || '';
    const env = cmdPayload?.environment || result.params?.environment || result.result?.environment || 'prod';
    const intent: UIIntentAction = {
      type: 'SHOW_PROD_CONFIRMATION',
      serviceName: svc,
      environment: env,
      message: result.bunny_message,
      rawResult: result
    };
    console.log('🎯 [UIIntentResolver] Resolved -> SHOW_PROD_CONFIRMATION:', intent);
    return intent;
  }

  // 2. Deployment Action (Single or Multi-Deploy)
  if (result.action_type === 'deploy' || result.tool === 'deploy_service' || cmdType === 'DEPLOY_SERVICE' || cmdType === 'CHECK_AND_DEPLOY') {
    const payloadServices = cmdPayload?.services || [];
    const payloadService = cmdPayload?.service || result.params?.service_name || '';

    const isMulti = result.result?.is_multi ||
      payloadServices.length > 1 ||
      (typeof payloadService === 'string' && payloadService.includes(','));

    const env = cmdPayload?.environment || result.params?.environment || result.result?.deployment?.environment || 'dev';

    if (isMulti) {
      const svcs = payloadServices.length > 0
        ? payloadServices
        : (typeof payloadService === 'string' ? payloadService.split(',').map(s => s.trim()) : []);

      const intent: UIIntentAction = {
        type: 'OPEN_MULTI_DEPLOY_MODAL',
        services: svcs,
        environment: env,
        message: result.bunny_message,
        rawResult: result
      };
      console.log('🎯 [UIIntentResolver] Resolved -> OPEN_MULTI_DEPLOY_MODAL:', intent);
      return intent;
    }

    const svcName = payloadService || result.result?.service_name || result.result?.deployment?.service || '';
    const depId = result.result?.deployment?.deployment_id || result.result?.deployment_id || '';

    const intent: UIIntentAction = {
      type: 'OPEN_DEPLOYMENT_TERMINAL',
      serviceName: svcName,
      environment: env,
      deploymentId: depId,
      message: result.bunny_message,
      rawResult: result
    };
    console.log('🎯 [UIIntentResolver] Resolved -> OPEN_DEPLOYMENT_TERMINAL:', intent);
    return intent;
  }

  // 3. Service Status / Detail Action
  if (result.tool === 'get_service_status' || result.action_type === 'status' || cmdType === 'GET_SERVICE_STATUS') {
    const svcName = cmdPayload?.service || result.result?.service_name || result.params?.service_name || '';
    const intent: UIIntentAction = {
      type: 'SELECT_SERVICE',
      serviceName: svcName,
      message: result.bunny_message,
      rawResult: result
    };
    console.log('🎯 [UIIntentResolver] Resolved -> SELECT_SERVICE:', intent);
    return intent;
  }

  // 4. Git Actions
  if (result.action_type === 'git' || cmdType?.startsWith('GIT_') || result.tool?.startsWith('git_')) {
    const svcName = cmdPayload?.service || result.params?.service_name || '';
    const intent: UIIntentAction = {
      type: 'SHOW_GIT_STATUS',
      serviceName: svcName,
      message: result.bunny_message,
      rawResult: result
    };
    console.log('🎯 [UIIntentResolver] Resolved -> SHOW_GIT_STATUS:', intent);
    return intent;
  }

  // 5. Monitoring / Stats
  if (result.tool === 'get_system_stats' || result.action_type === 'stats' || cmdType === 'GET_SYSTEM_STATS') {
    const intent: UIIntentAction = {
      type: 'SHOW_SYSTEM_STATS',
      message: result.bunny_message,
      rawResult: result
    };
    console.log('🎯 [UIIntentResolver] Resolved -> SHOW_SYSTEM_STATS:', intent);
    return intent;
  }

  console.log('🎯 [UIIntentResolver] Fallback -> NO_ACTION');
  return { type: 'NO_ACTION', message: result.bunny_message, rawResult: result };
}
