import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, logger } from 'camunda-external-task-client-js';

@Injectable()
export class CamundaWorkerService implements OnModuleInit, OnModuleDestroy {
  private client: Client;

  onModuleInit() {
    // Config External Task Client
    // const config = {
    //   baseUrl: process.env.CAMUNDA_BASE_URL || 'https://camunda-bpmn.lifetex.vn/engine-rest',
    //   use: logger,
    //   maxTasks: 5,
    //   asyncResponseTimeout: 15000,
    //   lockDuration: 10000,
    //   autoPoll: true,
    //   maxParallelExecutions: 10,
    // };

    // this.client = new Client(config);

    // // Register workers
    // this.registerWorkers();

    // // Error handling
    // this.client.on('poll:error', (error) => {
    //   console.error('❌ Camunda Poll Error:', error);
    // });

    // this.client.on('complete:error', (error) => {
    //   console.error('❌ Camunda Complete Error:', error);
    // });

    // console.log('✅ Camunda Worker Service started');
  }

  onModuleDestroy() {
    // if (this.client) {
    //   this.client.stop();
    //   console.log('🛑 Camunda Worker Service stopped');
    // }
  }

  // private registerWorkers() {
  //   // ==============================
  //   // WORKER: tp_hoan_thanh_van_ban
  //   // ==============================
  //   this.client.subscribe('tp_hoan_thanh_van_ban', async ({ task, taskService }) => {
  //     const variables = task.variables.getAll();
  //     console.log('📥 [tp_hoan_thanh_van_ban] Received task variables:', variables);

  //     try {
  //       const workItemId = variables.workItemId;
  //       const docIds = variables.docIds;
  //       // Dùng assignToUserId (người được giao tiếp theo), fallback về userId nếu không có
  //       const userId = variables.assignToUserId || variables.userId;
  //       const actionCode = variables.actionCode || 'HT_VBTT';
  //       const note = variables.note || '';

  //       console.log('🔍 Extracted data:', { 
  //         workItemId, 
  //         docIds, 
  //         userId,
  //         originalUserId: variables.userId,
  //         assignToUserId: variables.assignToUserId,
  //         actionCode, 
  //         note 
  //       });

  //       if (workItemId && docIds && userId) {
  //         const apiUrl = `${process.env.API_BASE_URL || 'http://localhost:3156'}/api/work-items/${workItemId}/complete-draft`;
  //         const payload = { docIds, userId, actionCode, note };

  //         console.log('📤 Calling API:', apiUrl);
  //         console.log('📤 Payload:', payload);

  //         // Lấy token từ variables hoặc env
  //         const token = variables.accessToken || process.env.API_ACCESS_TOKEN;

  //         const headers: Record<string, string> = {
  //           'Content-Type': 'application/json',
  //         };
  //         if (token) {
  //           headers['Authorization'] = `Bearer ${token}`;
  //         }

  //         const response = await fetch(apiUrl, {
  //           method: 'POST',
  //           headers,
  //           body: JSON.stringify(payload),
  //         });

  //         console.log('📥 API Response Status:', response.status);

  //         let data;
  //         try {
  //           data = await response.json();
  //         } catch {
  //           data = await response.text();
  //         }
  //         console.log('📥 API Response Body:', data);

  //         if (!response.ok) {
  //           throw new Error(`API call failed with status ${response.status}: ${JSON.stringify(data)}`);
  //         }
  //       } else {
  //         console.warn('⚠️ Missing required variables (workItemId, docIds, userId)');
  //       }

  //       await taskService.complete(task);
  //       console.log('✅ [tp_hoan_thanh_van_ban] Task completed successfully');
  //     } catch (error) {
  //       console.error('❌ [tp_hoan_thanh_van_ban] Error processing task:', error);
  //       await taskService.handleFailure(task, {
  //         errorMessage: error.message,
  //         retries: 0,
  //       });
  //     }
  //   });

  //   // ==============================
  //   // THÊM CÁC WORKER KHÁC Ở ĐÂY
  //   // ==============================
  //   // this.client.subscribe('another_topic', async ({ task, taskService }) => {
  //   //   // ...
  //   // });
  // }
}
