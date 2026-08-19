import { Injectable } from '@nestjs/common';
import { getAllNodeExtensionProperties } from 'src/utils/util';

export type ConcurrentStageStatus =
  | 'pending'
  | 'created'
  | 'processed'
  | 'covered-by-priority'
  | 'skipped';

export type ConcurrentHandleMode =
  | 'not-concurrent'
  | 'stage-artifacts-created'
  | 'wait-for-stage-completion'
  | 'continue-legacy-flow';

export interface ConcurrentStageNodeExtensions {
  isStartConcurrentStep?: string | boolean | null;
  executeConcurrentByStep?: string | null;
  isEndConcurrentStep?: string | boolean | null;
  isPriorityConcurrentNode?: string | boolean | number | null;
}

export interface ConcurrentStageNodeRef {
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  role?: string | null;
  extensions: ConcurrentStageNodeExtensions;
}

export interface ConcurrentStageArtifactRef {
  workItemId?: string | null;
  auditId?: string | number | null;
  status: ConcurrentStageStatus;
  exists: boolean;
}

export interface ConcurrentStageSnapshot {
  stageKey: string;
  triggerNode: ConcurrentStageNodeRef;
  targetNode: ConcurrentStageNodeRef;
  nodes: ConcurrentStageNodeRef[];
  startNodeIds: string[];
  endNodeIds: string[];
  priorityNodeIds: string[];
}

export interface ConcurrentStageProgressItem {
  nodeId: string;
  status: ConcurrentStageStatus;
  isPriority: boolean;
  hasOpenWorkItem: boolean;
  hasCreatedAudit: boolean;
  hasProcessedAudit: boolean;
}

export interface ConcurrentStageProgress {
  stageKey: string;
  items: ConcurrentStageProgressItem[];
  allProcessed: boolean;
  anyProcessed: boolean;
  anyEndNodeProcessed: boolean;
  anyPriorityProcessed: boolean;
  allPriorityProcessed: boolean;
  completionReason: 'all-processed' | 'priority-node-processed' | 'end-node-processed' | 'waiting';
  shouldContinueLegacyFlow: boolean;
}

export interface ConcurrentAdvanceContext {
  nextNode: any;
  targetRole?: string;
  typeSign?: string | null;
  stageStatus?: string | null;
  statusDoc?: string | null;
  assignees: Array<{ userId: string; signOrder: number }>;
}

export interface ConcurrentStageContext {
  documentId: string;
  typeDocument?: string | null;
  bpmnVersion?: string | null;
  userId: string;
  originalUser?: string | null;
  workItemId?: string | null;
  originWorkItemId?: string | null;
  currentNodeId: string;
  targetNodeId: string;
  indexes: {
    nodes: Map<string, any>;
    laneMap?: Map<string, string>;
    outgoingBySource?: Map<string, any[]>;
  };
  openWorkItems?: Array<{
    id: string;
    nodeId: string;
    role?: string | null;
    assigneeUserId?: string | null;
    nodeType?: string | null;
    state?: string | null;
  }>;
  auditArr?: any[];
  payload?: Record<string, any>;
  tx?: any;
  createArtifact?: (
    node: ConcurrentStageNodeRef,
    snapshot: ConcurrentStageSnapshot,
  ) => Promise<ConcurrentStageArtifactRef | null>;
  finalizePriorityCompletion?: (
    snapshot: ConcurrentStageSnapshot,
    currentNodeId: string,
  ) => Promise<void>;
  resolveAdvanceContext?: (
    snapshot: ConcurrentStageSnapshot,
    progress: ConcurrentStageProgress,
  ) => Promise<ConcurrentAdvanceContext | null>;
}

export interface ConcurrentEnsureArtifactsResult {
  createdNodeIds: string[];
  skippedNodeIds: string[];
  artifactsByNodeId: Record<string, ConcurrentStageArtifactRef>;
}

export interface ConcurrentHandleResult {
  mode: ConcurrentHandleMode;
  stage?: ConcurrentStageSnapshot;
  progress?: ConcurrentStageProgress;
  ensureArtifacts?: ConcurrentEnsureArtifactsResult;
  shouldCreateLegacyTargetNode?: boolean;
  advanceContext?: ConcurrentAdvanceContext | null;
  reason?: string;
}

@Injectable()
export class ConcurrentStageOrchestrator {
  async handleTargetNode(context: ConcurrentStageContext): Promise<ConcurrentHandleResult> {
    const snapshot = this.buildStageSnapshot(context);
    if (!snapshot) {
      return {
        mode: 'not-concurrent',
        shouldCreateLegacyTargetNode: true,
        reason: 'Target node does not belong to a concurrent stage.',
      };
    }

    const ensureArtifacts = await this.ensureStageArtifacts(context, snapshot);
    const progress = await this.evaluateStageProgress(context, snapshot);

    if (progress.shouldContinueLegacyFlow) {
      return {
        mode: 'continue-legacy-flow',
        stage: snapshot,
        progress,
        ensureArtifacts,
        shouldCreateLegacyTargetNode: !this.wasTargetNodeAlreadyCreated(context, snapshot),
      };
    }

    return {
      mode: 'wait-for-stage-completion',
      stage: snapshot,
      progress,
      ensureArtifacts,
      shouldCreateLegacyTargetNode: !this.wasTargetNodeAlreadyCreated(context, snapshot),
      reason: 'Stage is still in progress, keep waiting within the same concurrent stage.',
    };
  }

  async markNodeProcessed(context: ConcurrentStageContext): Promise<ConcurrentHandleResult> {
    const snapshot = this.buildStageSnapshot(context);
    if (!snapshot) {
      return {
        mode: 'not-concurrent',
        shouldCreateLegacyTargetNode: true,
        reason: 'Current node does not belong to a concurrent stage.',
      };
    }

    await this.markCurrentNodeProcessed(context, snapshot);
    await this.coverStageIfPriorityNodeCompleted(context, snapshot);

    const progress = await this.evaluateStageProgress(context, snapshot);
    const advanceContext = progress.shouldContinueLegacyFlow
      ? await this.resolveAdvanceContext(context, snapshot, progress)
      : null;

    return {
      mode: progress.shouldContinueLegacyFlow
        ? 'continue-legacy-flow'
        : 'wait-for-stage-completion',
      stage: snapshot,
      progress,
      shouldCreateLegacyTargetNode: false,
      advanceContext,
    };
  }

  buildStageSnapshot(context: ConcurrentStageContext): ConcurrentStageSnapshot | null {
    const targetNode = context.indexes.nodes.get(context.targetNodeId);
    if (!targetNode) return null;

    const targetExtensions = this.readConcurrentExtensions(targetNode);
    const stageKey = this.resolveStageKey(targetNode, targetExtensions);
    if (!stageKey) return null;

    const triggerNode = context.indexes.nodes.get(context.currentNodeId);
    const triggerRef = this.toNodeRef(triggerNode, context);
    const targetRef = this.toNodeRef(targetNode, context);
    const nodes = this.collectStageNodes(stageKey, context);
    const startNodeIds = nodes
      .filter((node) => this.isTrue(node.extensions.isStartConcurrentStep))
      .map((node) => node.nodeId);
    const endNodeIds = nodes
      .filter((node) => this.isTrue(node.extensions.isEndConcurrentStep))
      .map((node) => node.nodeId);
    const priorityNodeIds = nodes
      .filter((node) => this.isPriorityNode(node.extensions.isPriorityConcurrentNode))
      .map((node) => node.nodeId);

    return {
      stageKey,
      triggerNode: triggerRef,
      targetNode: targetRef,
      nodes,
      startNodeIds,
      endNodeIds,
      priorityNodeIds,
    };
  }

  async ensureStageArtifacts(
    context: ConcurrentStageContext,
    snapshot: ConcurrentStageSnapshot,
  ): Promise<ConcurrentEnsureArtifactsResult> {
    const createdNodeIds: string[] = [];
    const skippedNodeIds: string[] = [];
    const artifactsByNodeId: Record<string, ConcurrentStageArtifactRef> = {};

    for (const node of snapshot.nodes) {
      const existingArtifact = await this.findExistingArtifact(context, snapshot, node);
      artifactsByNodeId[node.nodeId] = existingArtifact;

      if (existingArtifact.exists) {
        skippedNodeIds.push(node.nodeId);
        continue;
      }

      let createdArtifact: ConcurrentStageArtifactRef | null = null;
      if (context.createArtifact) {
        createdArtifact = await context.createArtifact(node, snapshot);
      }

      createdNodeIds.push(node.nodeId);
      artifactsByNodeId[node.nodeId] = createdArtifact || {
        exists: false,
        status: 'created',
        workItemId: null,
        auditId: null,
      };

      if (createdArtifact?.workItemId) {
        context.openWorkItems = context.openWorkItems || [];
        context.openWorkItems.push({
          id: String(createdArtifact.workItemId),
          nodeId: node.nodeId,
          role: node.role || null,
          assigneeUserId: null,
          nodeType: node.nodeType || null,
          state: 'open',
        });
      }
    }

    return {
      createdNodeIds,
      skippedNodeIds,
      artifactsByNodeId,
    };
  }

  async evaluateStageProgress(
    context: ConcurrentStageContext,
    snapshot: ConcurrentStageSnapshot,
  ): Promise<ConcurrentStageProgress> {
    const items: ConcurrentStageProgressItem[] = [];

    for (const node of snapshot.nodes) {
      const item = await this.readStageProgressItem(context, snapshot, node);
      items.push(item);
    }

    const allProcessed = items.every((item) =>
      item.status === 'processed' || item.status === 'covered-by-priority',
    );
    const anyProcessed = items.some((item) => item.status === 'processed');
    const anyEndNodeProcessed = items.some(
      (item) => snapshot.endNodeIds.includes(item.nodeId) && item.status === 'processed',
    );
    const anyPriorityProcessed = items.some(
      (item) => item.isPriority && item.status === 'processed',
    );
    const hasPriorityNodes = snapshot.priorityNodeIds.length > 0;
    const allPriorityProcessed = hasPriorityNodes && snapshot.priorityNodeIds.every(
      (nodeId) => items.some(
        (item) => item.nodeId === nodeId && item.status === 'processed',
      ),
    );
    const completionReason = this.resolveCompletionReason({
      allProcessed,
      anyEndNodeProcessed,
      hasPriorityNodes,
      allPriorityProcessed,
    });

    return {
      stageKey: snapshot.stageKey,
      items,
      allProcessed,
      anyProcessed,
      anyEndNodeProcessed,
      anyPriorityProcessed,
      allPriorityProcessed,
      completionReason,
      shouldContinueLegacyFlow: completionReason !== 'waiting',
    };
  }

  private collectStageNodes(
    stageKey: string,
    context: ConcurrentStageContext,
  ): ConcurrentStageNodeRef[] {
    const nodes: ConcurrentStageNodeRef[] = [];

    for (const [, node] of context.indexes.nodes.entries()) {
      const extensions = this.readConcurrentExtensions(node);
      if (this.resolveStageKey(node, extensions) !== stageKey) {
        continue;
      }
      nodes.push(this.toNodeRef(node, context));
    }

    return nodes.sort((a, b) => {
      if (a.nodeId === context.targetNodeId) return -1;
      if (b.nodeId === context.targetNodeId) return 1;
      return String(a.nodeId).localeCompare(String(b.nodeId));
    });
  }

  private readConcurrentExtensions(node: any): ConcurrentStageNodeExtensions {
    const properties = getAllNodeExtensionProperties(node) || {};

    return {
      isStartConcurrentStep: properties.isStartConcurrentStep,
      executeConcurrentByStep: properties.executeConcurrentByStep,
      isEndConcurrentStep: properties.isEndConcurrentStep,
      isPriorityConcurrentNode:
        properties.isPriorityConcurrentNode ??
        properties.concurrentPriority ??
        properties.priority,
    };
  }

  private toNodeRef(node: any, context: ConcurrentStageContext): ConcurrentStageNodeRef {
    const extensions = this.readConcurrentExtensions(node);
    return {
      nodeId: node?.id,
      nodeName: node?.name,
      nodeType: node?.$type,
      role: context.indexes.laneMap?.get(node?.id) || null,
      extensions,
    };
  }

  private normalizeStageKey(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private resolveStageKey(
    node: any,
    extensions: ConcurrentStageNodeExtensions,
  ): string | null {
    const configuredStageKey = this.normalizeStageKey(
      extensions.executeConcurrentByStep,
    );
    if (configuredStageKey) {
      return configuredStageKey;
    }

    if (this.isTrue(extensions.isStartConcurrentStep) && node?.id) {
      return String(node.id);
    }

    return null;
  }

  private isPriorityNode(value: unknown): boolean {
    return this.isTrue(value) || String(value || '').trim().toLowerCase() === 'priority';
  }

  private isTrue(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  private async findExistingArtifact(
    context: ConcurrentStageContext,
    _snapshot: ConcurrentStageSnapshot,
    node: ConcurrentStageNodeRef,
  ): Promise<ConcurrentStageArtifactRef> {
    const openWorkItem = this.findOpenWorkItemByNodeId(context, node.nodeId);

    return {
      exists: Boolean(openWorkItem),
      status: openWorkItem ? 'created' : 'processed',
      workItemId: openWorkItem?.id || null,
      auditId: null,
    };
  }

  private async readStageProgressItem(
    context: ConcurrentStageContext,
    snapshot: ConcurrentStageSnapshot,
    node: ConcurrentStageNodeRef,
  ): Promise<ConcurrentStageProgressItem> {
    const isPriority = snapshot.priorityNodeIds.includes(node.nodeId);
    const openWorkItem = this.findOpenWorkItemByNodeId(context, node.nodeId);

    let status: ConcurrentStageStatus = openWorkItem ? 'created' : 'processed';
    if (!openWorkItem && isPriority && snapshot.priorityNodeIds.length > 0) {
      status = 'processed';
    }

    return {
      nodeId: node.nodeId,
      status,
      isPriority,
      hasOpenWorkItem: Boolean(openWorkItem),
      hasCreatedAudit: Boolean(openWorkItem),
      hasProcessedAudit: !openWorkItem,
    };
  }

  private async markCurrentNodeProcessed(
    _context: ConcurrentStageContext,
    _snapshot: ConcurrentStageSnapshot,
  ): Promise<void> {
    // Runtime updates audit/work item state before calling this orchestrator hook.
  }

  private async coverStageIfPriorityNodeCompleted(
    context: ConcurrentStageContext,
    snapshot: ConcurrentStageSnapshot,
  ): Promise<void> {
    const resolvedPriorityNodeId = this.resolvePriorityCompletionNodeId(context, snapshot);
    if (!resolvedPriorityNodeId) return;

    const allPriorityProcessed = snapshot.priorityNodeIds.every(
      (nodeId) => !this.findOpenWorkItemByNodeId(context, nodeId),
    );
    if (!allPriorityProcessed) return;

    await context.finalizePriorityCompletion?.(snapshot, resolvedPriorityNodeId);
  }

  private async resolveAdvanceContext(
    context: ConcurrentStageContext,
    snapshot: ConcurrentStageSnapshot,
    progress: ConcurrentStageProgress,
  ): Promise<ConcurrentAdvanceContext | null> {
    if (!progress.shouldContinueLegacyFlow) return null;
    return context.resolveAdvanceContext?.(snapshot, progress) ?? null;
  }

  private findOpenWorkItemByNodeId(
    context: ConcurrentStageContext,
    nodeId: string,
  ): { id: string; nodeId: string } | undefined {
    return (context.openWorkItems || []).find(
      (item) => String(item.nodeId) === String(nodeId),
    );
  }

  private isCurrentNodeProcessedViaPriorityBranch(
    context: ConcurrentStageContext,
    snapshot: ConcurrentStageSnapshot,
    items: ConcurrentStageProgressItem[],
  ): boolean {
    const resolvedPriorityNodeId = this.resolvePriorityCompletionNodeId(context, snapshot);
    if (!resolvedPriorityNodeId) return false;

    const currentNodeIds = [context.currentNodeId, context.targetNodeId]
      .map((nodeId) => String(nodeId || '').trim())
      .filter(Boolean);

    const matchedProcessedNode = currentNodeIds.find((nodeId) =>
      items.some((item) => item.nodeId === nodeId && item.status === 'processed'),
    );
    return Boolean(matchedProcessedNode);
  }

  private resolvePriorityCompletionNodeId(
    context: ConcurrentStageContext,
    snapshot: ConcurrentStageSnapshot,
  ): string | null {
    const currentNodeIds = [context.currentNodeId, context.targetNodeId]
      .map((nodeId) => String(nodeId || '').trim())
      .filter(Boolean);

    if (!currentNodeIds.length || !snapshot.priorityNodeIds.length) {
      return null;
    }

    for (const currentNodeId of currentNodeIds) {
      const directPriorityNode = snapshot.nodes.find(
        (node) =>
          node.nodeId === currentNodeId &&
          this.isPriorityNode(node.extensions.isPriorityConcurrentNode),
      );
      if (directPriorityNode?.nodeId) {
        return directPriorityNode.nodeId;
      }

      for (const priorityNodeId of snapshot.priorityNodeIds) {
        if (this.isNodeReachableFromPriorityNode(currentNodeId, priorityNodeId, snapshot, context)) {
          return priorityNodeId;
        }
      }
    }

    return null;
  }

  private isNodeReachableFromPriorityNode(
    targetNodeId: string,
    priorityNodeId: string,
    snapshot: ConcurrentStageSnapshot,
    context: ConcurrentStageContext,
  ): boolean {
    if (String(targetNodeId) === String(priorityNodeId)) {
      return true;
    }

    const stageNodeIds = new Set(snapshot.nodes.map((node) => String(node.nodeId || '').trim()).filter(Boolean));
    const outgoingBySource = context.indexes.outgoingBySource;
    if (!outgoingBySource || !stageNodeIds.has(String(priorityNodeId))) {
      return false;
    }

    const visited = new Set<string>();
    const queue: string[] = [String(priorityNodeId)];

    while (queue.length) {
      const currentNodeId = queue.shift();
      if (!currentNodeId || visited.has(currentNodeId)) {
        continue;
      }
      visited.add(currentNodeId);

      const outs = outgoingBySource.get(currentNodeId) || [];
      for (const flow of outs) {
        const nextNodeId = String(flow?.targetRef?.id || '').trim();
        if (!nextNodeId || !stageNodeIds.has(nextNodeId) || visited.has(nextNodeId)) {
          continue;
        }
        if (nextNodeId === String(targetNodeId)) {
          return true;
        }
        queue.push(nextNodeId);
      }
    }

    return false;
  }

  private wasTargetNodeAlreadyCreated(
    context: ConcurrentStageContext,
    snapshot: ConcurrentStageSnapshot,
  ): boolean {
    const targetNode = snapshot.nodes.find((node) => node.nodeId === context.targetNodeId);
    if (!targetNode) return false;
    return Boolean(this.findOpenWorkItemByNodeId(context, targetNode.nodeId));
  }

  private resolveCompletionReason({
    allProcessed,
    anyEndNodeProcessed,
    hasPriorityNodes,
    allPriorityProcessed,
  }: {
    allProcessed: boolean;
    anyEndNodeProcessed: boolean;
    hasPriorityNodes: boolean;
    allPriorityProcessed: boolean;
  }): ConcurrentStageProgress['completionReason'] {
    // Khi stage có priority node, bắt buộc chờ toàn bộ priority node.
    // End node hoặc node thường hoàn thành không được đi tắt qua điều kiện này.
    if (hasPriorityNodes) {
      return allPriorityProcessed ? 'priority-node-processed' : 'waiting';
    }
    if (anyEndNodeProcessed) return 'end-node-processed';
    if (allProcessed) return 'all-processed';
    return 'waiting';
  }
}
