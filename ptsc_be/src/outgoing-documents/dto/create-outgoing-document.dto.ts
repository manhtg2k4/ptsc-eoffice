export class CreateOutgoingDto {
    senderUnit: number;
    drafter_id: number;
    document_type: string;
    urgency_level: string;
    security_level: string;
    field: string;

    approver_id: number;
    approver_symbol: string;

    signer_id: number;
    draft_symbol: string;

    notify_unit: string;
    due_date: string;
    summary: string;

    receivers: {
        receiver_type: 'internal_unit' | 'external_unit' | 'internal_department' | 'handler';
        receiver_id: number;
    }[];
}
