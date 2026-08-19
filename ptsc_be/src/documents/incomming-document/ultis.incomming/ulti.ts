import * as sql from 'mssql';

const TABLE_MAP = {
  incoming: 'incomming_documents',
  outgoing: 'outgoing_documents',
} as const;

const COLUMN_MAP = {
    documentId: 'document_id',
    deadline: 'deadline',
    senderUnit: 'sender_unit',
    receiverUnit: 'receiver_unit',
    createdAt: 'created_at',
    status: 'status',
} as const;

type SelectField = keyof typeof COLUMN_MAP;
type TableKey = keyof typeof TABLE_MAP;

function buildSelect(selectFields: SelectField[]) {
    if (!selectFields?.length) throw new Error('Select required');

    return selectFields
        .map(f => {
            const col = COLUMN_MAP[f];
            if (!col) throw new Error(`Invalid select field: ${f}`);
            return col;
        })
        .join(', ');
}
type Filters = {
    startDate?: string;
    endDate?: string;
    senderUnit?: string[];
    receiverUnit?: string[];
    status?: number;
};

function buildWhereClause(filters: Filters, request: sql.Request) {
    const conditions: string[] = [];

    if (filters.startDate) {
        conditions.push('created_at >= @startDate');
        request.input('startDate', sql.DateTime, filters.startDate);
    }

    if (filters.endDate) {
        conditions.push('created_at < DATEADD(DAY,1,@endDate)');
        request.input('endDate', sql.DateTime, filters.endDate);
    }

    if (filters.status !== undefined) {
        conditions.push('status = @status');
        request.input('status', sql.Int, filters.status);
    }

    // ===== ARRAY FILTER (giữ index tốt hơn STRING_SPLIT) =====
    if (filters.senderUnit?.length) {
        filters.senderUnit.forEach((v, i) => {
            request.input(`sender${i}`, sql.NVarChar(50), v);
        });

        const inClause = filters.senderUnit.map((_, i) => `@sender${i}`).join(',');
        conditions.push(`sender_unit IN (${inClause})`);
    }

    if (filters.receiverUnit?.length) {
        filters.receiverUnit.forEach((v, i) => {
            request.input(`receiver${i}`, sql.NVarChar(50), v);
        });

        const inClause = filters.receiverUnit.map((_, i) => `@receiver${i}`).join(',');
        conditions.push(`receiver_unit IN (${inClause})`);
    }

    return conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
}
