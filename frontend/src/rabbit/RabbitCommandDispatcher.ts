import { RabbitCommand, RabbitCommandType } from './RabbitCommandTypes';

export interface RabbitDispatcherHandlers {
  onDeployService: (service: string, env: string) => void;
  onMultiDeploy: (services: string[], env: string) => void;
  onOpenDeploymentLogs: (deploymentId: string) => void;
  onOpenProdConfirmation: (service: string, msg: string) => void;
  onSelectService: (serviceName: string) => void;
  onOpenMultiDeployModal: () => void;
  onShowSystemStats: () => void;
  onGitAction: (action: string, serviceName: string, branch?: string) => void;
  onClarification: (question: string, candidates?: string[]) => void;
}

export class RabbitCommandDispatcher {
  private handlers: RabbitDispatcherHandlers;

  constructor(handlers: RabbitDispatcherHandlers) {
    this.handlers = handlers;
  }

  public execute(command: RabbitCommand): void {
    if (!command) {
      console.warn('🐰 [RabbitDispatcher] Received empty or null command.');
      return;
    }

    console.log(`🐰 [RabbitDispatcher] Processing command [${command.type}]:`, command);

    switch (command.type) {
      case 'DEPLOY_SERVICE':
        console.log('🐰 [RabbitDispatcher] -> Executing handleDeployService');
        this.handleDeployService(command);
        break;

      case 'GET_SERVICE_STATUS':
        console.log('🐰 [RabbitDispatcher] -> Executing GET_SERVICE_STATUS:', command.payload.service);
        if (command.payload.service) {
          this.handlers.onSelectService(command.payload.service);
        }
        break;

      case 'LIST_SERVICES':
        console.log('🐰 [RabbitDispatcher] -> Executing LIST_SERVICES');
        this.handlers.onOpenMultiDeployModal();
        break;

      case 'GIT_PULL':
      case 'GIT_CHECKOUT':
      case 'GIT_STATUS':
        console.log(`🐰 [RabbitDispatcher] -> Executing ${command.type}:`, command.payload);
        if (command.payload.service) {
          this.handlers.onGitAction(command.type.toLowerCase(), command.payload.service, command.payload.branch);
        }
        break;

      case 'GET_SYSTEM_STATS':
        console.log('🐰 [RabbitDispatcher] -> Executing GET_SYSTEM_STATS');
        this.handlers.onShowSystemStats();
        break;

      case 'GET_DEPLOYMENT_LOGS':
        console.log('🐰 [RabbitDispatcher] -> Executing GET_DEPLOYMENT_LOGS:', command.payload.deployment_id);
        if (command.payload.deployment_id) {
          this.handlers.onOpenDeploymentLogs(command.payload.deployment_id);
        }
        break;

      case 'ROLLBACK_DEPLOYMENT':
        console.log('🐰 [RabbitDispatcher] -> Executing ROLLBACK_DEPLOYMENT:', command.payload);
        if (command.payload.service) {
          this.handlers.onDeployService(command.payload.service, command.payload.environment || 'dev');
        }
        break;

      case 'CHECK_AND_DEPLOY':
        console.log('🐰 [RabbitDispatcher] -> Executing CHECK_AND_DEPLOY:', command.payload);
        this.handleCheckAndDeploy(command);
        break;

      case 'NEED_CLARIFICATION':
        console.log('🐰 [RabbitDispatcher] -> Executing NEED_CLARIFICATION:', command.payload);
        if (command.payload.question) {
          this.handlers.onClarification(command.payload.question, command.payload.candidates);
        }
        break;

      case 'UNKNOWN':
      default:
        console.warn(`🐰 [RabbitDispatcher] Unhandled or unknown command type: ${command.type}`);
        break;
    }
  }

  private handleDeployService(command: RabbitCommand): void {
    const env = (command.payload.environment || 'dev').toLowerCase();
    const service = command.payload.service || '';
    const services = command.payload.services || [];

    console.log('🐰 [RabbitDispatcher] handleDeployService evaluation:', { service, services, env, confirmProd: command.payload.confirm_production });

    // Production Safety Confirmation Gate
    if (env === 'prod' || env === 'production') {
      if (!command.payload.confirm_production) {
        console.log('🔒 [RabbitDispatcher] Production safety gate triggered! Requiring user confirmation.');
        this.handlers.onOpenProdConfirmation(service || services.join(', '), command.bunny_message);
        return;
      }
    }

    // Multi-service deploy check
    if (services.length > 1 || (service && service.includes(','))) {
      const svcList = services.length > 0 ? services : service.split(',').map(s => s.trim());
      console.log('🚀 [RabbitDispatcher] Triggering MultiDeploy for services:', svcList);
      this.handlers.onMultiDeploy(svcList, env);
      return;
    }

    if (service) {
      console.log('🚀 [RabbitDispatcher] Triggering Single Service Deploy for:', service, 'on env:', env);
      this.handlers.onDeployService(service, env);
    }
  }

  private handleCheckAndDeploy(command: RabbitCommand): void {
    const service = command.payload.service || '';
    const env = command.payload.environment || 'stg';
    if (!service) return;

    console.log('🔍 [RabbitDispatcher] Step 1: Selecting service for health check:', service);
    this.handlers.onSelectService(service);

    console.log('🚀 [RabbitDispatcher] Step 2: Orchestrating deploy in 500ms...');
    setTimeout(() => {
      this.handleDeployService({
        type: 'DEPLOY_SERVICE',
        payload: { service, environment: env },
        bunny_message: command.bunny_message
      });
    }, 500);
  }
}
