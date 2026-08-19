import { Injectable, Logger } from '@nestjs/common';
import * as xml2js from 'xml2js';

interface ServiceTaskInfo {
  id: string;
  name: string;
  topic: string;
  type: 'external' | 'expression' | 'class';
}

interface ExecutionContext {
  nodeId: string;
  bpmnXml: string;
  variables: any;
  documentId?: string;
  userId?: string;
  receiverUnit?: string;
}

@Injectable()
export class ServiceTaskExecutorService {
  private readonly logger = new Logger(ServiceTaskExecutorService.name);
  private handlers: Map<string, (variables: any) => Promise<any>> = new Map();

  /**
   * Register handler cho một topic
   */
  registerHandler(topic: string, handler: (variables: any) => Promise<any>) {
    this.handlers.set(topic, handler);
  }

  /**
   * Parse BPMN XML và tìm Service Task theo nodeId
   */
  async findServiceTask(
    bpmnXml: string,
    nodeId: string,
  ): Promise<ServiceTaskInfo | null> {
    try {
      // Kiểm tra bpmnXml có tồn tại không
      if (!bpmnXml || typeof bpmnXml !== 'string') {
        this.logger.warn(`⚠️ BPMN XML is ${bpmnXml === null ? 'null' : bpmnXml === undefined ? 'undefined' : 'invalid'} for node ${nodeId}`);
        return null;
      }

      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(bpmnXml);

      // Tìm trong tất cả các process
      const definitions = result['bpmn:definitions'] || result['bpmn2:definitions'];
      if (!definitions) {
        return null;
      }

      const processes = definitions['bpmn:process'] || definitions['bpmn2:process'] || [];

      for (const process of processes) {
        // Tìm serviceTask
        const serviceTasks = process['bpmn:serviceTask'] || process['bpmn2:serviceTask'] || [];

        for (const task of serviceTasks) {
          const taskId = task.$.id || task.$?.['@_id'];

          if (taskId === nodeId) {
            const taskName = task.$.name || task.$?.['@_name'] || '';
            const topic = task.$['camunda:topic'] || task.$?.['camunda:topic'] || '';
            const type = task.$['camunda:type'] || task.$?.['camunda:type'] || 'external';


            return {
              id: taskId,
              name: taskName,
              topic,
              type,
            };
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error('❌ Error parsing BPMN XML:', error);
      return null;
    }
  }

  /**
   * Execute Service Task nếu node hiện tại là Service Task
   */
  async executeIfServiceTask(context: ExecutionContext): Promise<any> {
    const { nodeId, bpmnXml, variables } = context;


    // 1. Kiểm tra node có phải Service Task không
    const serviceTask = await this.findServiceTask(bpmnXml, nodeId);

    if (!serviceTask) {
      return null;
    }

    // 2. Kiểm tra có handler cho topic này không
    if (!serviceTask.topic) {
      this.logger.warn(`⚠️ Service Task ${nodeId} has no topic configured`);
      return null;
    }

    const handler = this.handlers.get(serviceTask.topic);

    if (!handler) {
      this.logger.warn(`⚠️ No handler found for topic: ${serviceTask.topic}`);
      return null;
    }

    // 3. Execute handler
    try {

      const result = await handler(variables);


      return result;
    } catch (error) {
      this.logger.error(`❌ Service Task execution failed:`, error);
      throw error;
    }
  }

  /**
   * Get all registered topics
   */
  getRegisteredTopics(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if handler exists
   */
  hasHandler(topic: string): boolean {
    return this.handlers.has(topic);
  }
}
