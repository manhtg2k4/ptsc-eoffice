import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('outgoing_documents')
export class OutgoingDocumentEntity {
  // 1. id (int, PK, Identity)
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  // 2. document_id (varchar 100, Not Null)
  @Column({ name: 'document_id', type: 'varchar', length: 100 })
  documentId: string;

  // 3. status_code (varchar 20, Default '1')
  @Column({ name: 'status_code', type: 'varchar', length: 20, nullable: true, default: '1' })
  statusCode: string;

  // 4. sender_unit (varchar 100)
  @Column({ name: 'sender_unit', type: 'varchar', length: 100, nullable: true })
  senderUnit: string;

  // 5. drafter (varchar 100)
  @Column({ name: 'drafter', type: 'varchar', length: 100, nullable: true })
  drafter: string;

  // 6. document_type (varchar 100)
  @Column({ name: 'document_type', type: 'varchar', length: 100, nullable: true })
  documentType: string;

  // 7. urgency_level (varchar 100)
  @Column({ name: 'urgency_level', type: 'varchar', length: 100, nullable: true })
  urgencyLevel: string;

  // 8. private_level (varchar 100)
  @Column({ name: 'private_level', type: 'varchar', length: 100, nullable: true })
  privateLevel: string;

  // 9. document_field (varchar 100)
  @Column({ name: 'document_field', type: 'varchar', length: 100, nullable: true })
  documentField: string;

  // 10. report_signer (nvarchar MAX - JSON array)
  @Column({ name: 'report_signer', type: 'nvarchar', length: 'MAX', nullable: true })
  reportSigner: string;

  // 11. report_document_symbol (nvarchar 255)
  @Column({ name: 'report_document_symbol', type: 'nvarchar', length: 255, nullable: true })
  reportDocumentSymbol: string;

  // 12. to_book_text_symbols (nvarchar 255)
  @Column({ name: 'to_book_text_symbols', type: 'nvarchar', length: 255, nullable: true })
  toBookTextSymbols: string;

  // 13. viewers (nvarchar MAX) - JSON
  @Column({ name: 'viewers', type: 'nvarchar', length: 'MAX', nullable: true })
  viewers: string;

  // 14. deadline_reply (datetime)
  @Column({ name: 'deadline_reply', type: 'datetime', nullable: true })
  deadlineReply: Date;

  // 15. abstract_note (nvarchar MAX)
  @Column({ name: 'abstract_note', type: 'nvarchar', length: 'MAX', nullable: true })
  abstractNote: string;

  // 16. recipient_ids (nvarchar MAX) - JSON
  @Column({ name: 'recipient_ids', type: 'nvarchar', length: 'MAX', nullable: true })
  recipientIds: string;

  // 17. internal_receiving_unit (nvarchar MAX) - JSON
  @Column({ name: 'internal_receiving_unit', type: 'nvarchar', length: 'MAX', nullable: true })
  internalReceivingUnit: string;

  // 18. reply_incomming_doc (varchar 100)
  @Column({ name: 'reply_incomming_doc', type: 'varchar', length: 100, nullable: true })
  replyIncommingDoc: string;

  // 19. created_at (datetime, default getdate())
  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  // 20. updated_at (datetime, default getdate())
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  // 21. draft_signer (varchar 100)
  @Column({ name: 'draft_signer', type: 'varchar', length: 100, nullable: true })
  draftSigner: string;

  // 22. book_document_id (int)
  @Column({ name: 'book_document_id', type: 'int', nullable: true })
  bookDocumentId: number;

  // 23. status (int, Default 1)
  @Column({ name: 'status', type: 'int', nullable: true, default: 1 })
  status: number;

  // 24. code_commanders (nvarchar MAX)
  @Column({ name: 'code_commanders', type: 'nvarchar', length: 'MAX', nullable: true })
  codeCommanders: string;

  // 25. commanders (nvarchar MAX)
  @Column({ name: 'commanders', type: 'nvarchar', length: 'MAX', nullable: true })
  commanders: string;

  // 26. current_note (nvarchar MAX)
  @Column({ name: 'current_note', type: 'nvarchar', length: 'MAX', nullable: true })
  currentNote: string;

  // 27. to_book (int)
  @Column({ name: 'to_book', type: 'int', nullable: true })
  toBook: number;

  // 28. release_no (nvarchar 255)
  @Column({ name: 'release_no', type: 'nvarchar', length: 255, nullable: true })
  releaseNo: string;

  // 29. release_date (varchar 30 - THEO ẢNH LÀ VARCHAR, KHÔNG PHẢI DATETIME)
  @Column({ name: 'release_date', type: 'varchar', length: 30, nullable: true })
  releaseDate: string;

  // 30. text_symbols (nvarchar 255)
  @Column({ name: 'text_symbols', type: 'nvarchar', length: 255, nullable: true })
  textSymbols: string;

  // --- CÁC CỘT FILE (nvarchar MAX) ---
  // 31
  @Column({ name: 'doc_work_files', type: 'nvarchar', length: 'MAX', nullable: true })
  docWorkFiles: string;

  // 32
  @Column({ name: 'doc_proposal', type: 'nvarchar', length: 'MAX', nullable: true })
  docProposal: string;

  // 33
  @Column({ name: 'doc_draft', type: 'nvarchar', length: 'MAX', nullable: true })
  docDraft: string;

  // 34
  @Column({ name: 'doc_attachments', type: 'nvarchar', length: 'MAX', nullable: true })
  docAttachments: string;

  // 35
  @Column({ name: 'doc_recall', type: 'nvarchar', length: 'MAX', nullable: true })
  docRecall: string;

  // 36
  @Column({ name: 'doc_replacement', type: 'nvarchar', length: 'MAX', nullable: true })
  docReplacement: string;

  // 37
  @Column({ name: 'doc_answer', type: 'nvarchar', length: 'MAX', nullable: true })
  docAnswer: string;

  // 38
  @Column({ name: 'external_receiving_unit', type: 'nvarchar', length: 'MAX', nullable: true })
  externalReceivingUnit: string;

  // 39
  @Column({ name: 'internal_receiving_dept', type: 'nvarchar', length: 'MAX', nullable: true })
  internalReceivingDept: string;

  // Đơn vị nhận cũ
  @Column({ name: 'internal_receiving_dept_old', type: 'nvarchar', length: 'MAX', nullable: true })
  internalReceivingDeptOld: string;

  // 40
  @Column({ name: 'processor', type: 'nvarchar', length: 'MAX', nullable: true })
  processor: string;

  // 41
  @Column({ name: 'files', type: 'nvarchar', length: 'MAX', nullable: true })
  files: string;

  // 42. type_doc (int, Default 1)
  @Column({ name: 'type_doc', type: 'int', nullable: true, default: 1 })
  typeDoc: number;

  // 43. bpmn_version (varchar 24)
  @Column({ name: 'bpmn_version', type: 'varchar', length: 24, nullable: true })
  bpmnVersion: string;

  // 44. vieweds (nvarchar MAX) - Có vẻ là lịch sử xem?
  @Column({ name: 'vieweds', type: 'nvarchar', length: 'MAX', nullable: true })
  vieweds: string;

  // 45. nơi nhận để biết (nvarchar MAX)
  @Column({ name: 'know_receivers', type: 'nvarchar', length: 'MAX', nullable: true })
  knowReceivers: string;

  @Column({ name: 'document_viewer_groups', type: 'nvarchar', length: 'MAX', nullable: true })
  documentViewerGroups: string;

  //46. Loại quy trình (đã comment vì không có column này trong DB)
  // @Column({ name: 'type_of_process', type: 'nvarchar',length: 'MAX',nullable: true })
  // typeOfProcess: string;

  @Column({ name: 'from_create_draf', type: 'bit', nullable: true })
  fromCreateDraf: number;

  @Column({ name: 'replaced', type: 'bit', default: () => '0' })
  replaced: boolean;

  // 47. document_date (varchar 30 - THEO ẢNH LÀ VARCHAR, KHÔNG PHẢI DATETIME)
  @Column({ name: 'document_date', type: 'varchar', length: 30, nullable: true })
  documentDate: string;

  // 48. signature_type (varchar 100)
  @Column({ name: 'signature_type', type: 'varchar', length: 100, nullable: true, default: 'digitalSignature' })
  signatureType: string;

  @Column({ name: 'is_stamp', type: 'bit', nullable: true })
  isStamp: boolean;

  @Column({ name: 'req_sign_format_draft', type: 'bit', nullable: true })
  reqSignFormatDraft: boolean;
}
