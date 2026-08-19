import { Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, IsInt, Min, ArrayNotEmpty } from 'class-validator';

export class UpdateDocDto {
  // Các thuộc tính có thể cập nhật
  @IsString() @IsOptional() statusCode?: string;
  @IsString() @IsOptional() receiverUnit?: string;
  @IsString() @IsOptional() toBookCode?: string;
  @IsString() @IsOptional() abstractNote?: string;
  @IsString() @IsOptional() toBook?: string;
  @IsString() @IsOptional() senderUnit?: string;
  @IsString() @IsOptional() secondBook?: string;
  @IsString() @IsOptional() signer?: string;
  @IsString() @IsOptional() fileids?: string;
  @IsString() @IsOptional() viewGroup?: string;

  @IsString() @IsOptional() receiveMethod?: string;
  @IsString() @IsOptional() privateLevel?: string;
  @IsString() @IsOptional() urgencyLevel?: string;
  @IsString() @IsOptional() documentType?: string;
  @IsString() @IsOptional() documentField?: string;

  @IsOptional() documentDate?: Date | string;
  @IsOptional() receiveDate?: Date | string;
  @IsOptional() toBookDate?: Date | string;
  @IsOptional() deadline?: Date | string;
  @IsOptional() resolutionDeadline?: Date | string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'bookDocumentId phải là số nguyên' })
  @Min(0, { message: 'bookDocumentId không được nhỏ hơn 0' })
  bookDocumentId: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'copyCount phải là số nguyên' })
  @Min(0, { message: 'copyCount không được nhỏ hơn 0' })
  copyCount?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageCount phải là số nguyên' })
  @Min(0, { message: 'pageCount không được nhỏ hơn 0' })
  pageCount?: number;
  @IsOptional()
  @Type(() => Boolean)
  isStamp?: boolean;
}

export class UpdateOutDocDto {
  @IsString() @IsOptional() nodeId?: string;
  @IsString() @IsOptional() assigneeUserId?: string;
  @IsString() @IsOptional() statusCode?: string;

  @IsString() @IsOptional() senderUnit?: string;
  @IsString() @IsOptional() drafter?: string;

  @IsString() @IsOptional() documentType?: string;
  @IsString() @IsOptional() urgencyLevel?: string;
  @IsString() @IsOptional() privateLevel?: string;
  @IsString() @IsOptional() documentField?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  reportSigner?: string[];

  @IsString() @IsOptional() toBookTextSymbols?: string;
  @IsString() @IsOptional() abstractNote?: string;
  @IsOptional() deadlineReply?: Date | string;

  @IsOptional() docWorkFiles?: any[];
  @IsOptional() docReplacement?: any[];
  @IsOptional() docAnswer?: any[];
  @IsOptional() knowReceivers?: any[];
  @IsArray()
  @IsOptional()
  internalReceivingDept?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  internalReceivingDeptOld?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documentViewerGroups?: string[];

  @IsOptional()
  @IsArray()
  // @IsString({ each: true })
  processor?: any[];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'bookDocumentId phải là số nguyên' })
  @Min(0, { message: 'bookDocumentId không được nhỏ hơn 0' })
  bookDocumentId?: number;

  @IsOptional()
  @Type(() => String)
  documentId?: string;

  @IsOptional()
  @Type(() => String)
  signFormatDraft: string[];

  @IsOptional()
  @Type(() => String)
  signContentDraft?: string[];


  @IsOptional()
  @Type(() => Boolean)
  reqSignFormatDraft?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  isStamp?: boolean;

  @IsString() @IsOptional() typeOfProcess?: string;
  @IsString() @IsOptional() signatureType?: string;
  @IsOptional() fromCreateDraf?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) officialSigner1?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) paraphSigner?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) officialSigner2?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) officialSigner3?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) confirmer?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) appraiser?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) signStamp?: string[];

  @IsOptional()
  toBook?: string | number;

  @IsString() @IsOptional() toBookCode?: string;
  @IsString() @IsOptional() releaseNo?: string;
}
