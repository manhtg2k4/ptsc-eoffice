import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDefined,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  Min,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateDocDto {
  @IsString() @IsOptional() nodeId?: string;

  @IsDefined({ message: 'assigneeUserId là bắt buộc' })
  @IsString()
  @IsNotEmpty()
  assigneeUserId: string;

  // Các thuộc tính khác của document
  @IsString() @IsOptional() statusCode?: string;
  @IsNumber() bookDocumentId: number;
  @IsDefined({ message: 'abstractNote là bắt buộc' })
  @IsString() @IsNotEmpty() abstractNote: string;
  @IsDefined({ message: 'toBook là bắt buộc' })
  @IsString() @IsNotEmpty() toBook: string;
  // @IsDefined({ message: 'senderUnit là bắt buộc' })
  @IsString() @IsNotEmpty() senderUnit: string;
  @IsDefined({ message: 'receiverUnit là bắt buộc' })
  @IsString() @IsNotEmpty() receiverUnit: string;
  @IsDefined({ message: 'viewGroup là bắt buộc' })
  @IsString() @IsNotEmpty() viewGroup: string;
  @IsDefined({ message: 'documentDate là bắt buộc' })
  @IsNotEmpty() documentDate: Date | string;
  @IsDefined({ message: 'receiveDate là bắt buộc' })
  @IsNotEmpty() receiveDate: Date | string;
  @IsDefined({ message: 'toBookCode là bắt buộc' })
  @IsNotEmpty() toBookCode: string;
  @IsOptional() toBookDate?: Date | string;
  @IsOptional() deadline?: Date | string;
  @IsString() @IsOptional() secondBook?: string;
  @IsString() @IsOptional() receiveMethod?: string;
  @IsString() @IsOptional() privateLevel?: string;
  @IsString() @IsOptional() urgencyLevel?: string;
  @IsString() @IsOptional() documentType?: string;
  @IsString() @IsOptional() documentField?: string;
  @IsString() @IsOptional() signer?: string;
  @IsOptional() resolutionDeadline?: Date | string;
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

export class CreateDocDtoDraft {
  @IsString()
  @IsOptional()
  nodeId?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  assigneeUserId?: string;

  @IsString()
  @IsOptional()
  statusCode?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  bookDocumentId?: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  abstractNote?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  toBook?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  senderUnit?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  receiverUnit?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  viewGroup?: string;

  @IsOptional()
  @IsDateString({}, { message: 'documentDate phải là ISO date' })
  documentDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'receiveDate phải là ISO date' })
  receiveDate?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  toBookCode?: string;

  @IsOptional()
  @IsDateString({}, { message: 'toBookDate phải là ISO date' })
  toBookDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'deadline phải là ISO date' })
  deadline?: string;

  @IsString()
  @IsOptional()
  secondBook?: string;

  @IsString()
  @IsOptional()
  receiveMethod?: string;

  @IsString()
  @IsOptional()
  privateLevel?: string;

  @IsString()
  @IsOptional()
  urgencyLevel?: string;

  @IsString()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  documentField?: string;

  @IsString()
  @IsOptional()
  signer?: string;

  @IsOptional()
  @IsDateString({}, { message: 'resolutionDeadline phải là ISO date' })
  resolutionDeadline?: string;

  @Type(() => Number)
  @IsInt({ message: 'copyCount phải là số nguyên' })
  @Min(0, { message: 'copyCount không được nhỏ hơn 0' })
  @IsOptional()
  copyCount?: number;

  @Type(() => Number)
  @IsInt({ message: 'pageCount phải là số nguyên' })
  @Min(0, { message: 'pageCount không được nhỏ hơn 0' })
  @IsOptional()
  pageCount?: number;
}


export class CreateOutDocDto {
  @IsString() @IsOptional() documentId?: string;
  @IsString() @IsOptional() nodeId?: string;
  @IsString() @IsOptional() assigneeUserId?: string;
  @IsNumber() @IsOptional() bookDocumentId?: number;
  @IsString() @IsOptional() statusCode?: string;
  @IsOptional()
  @IsString()
  senderUnit?: string;
  @IsOptional()
  @IsString()
  drafter?: string;
  @IsString() @IsOptional() documentType?: string;
  @IsString() @IsOptional() urgencyLevel?: string;
  @IsString() @IsOptional() privateLevel?: string;
  @IsString() @IsOptional() documentField?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reportSigner?: string[];

  @IsOptional()
  @IsString()
  toBookTextSymbols?: string;

  @IsString() @IsOptional() deadlineReply?: Date | string;
  @IsOptional()
  @IsString()
  abstractNote?: string;

  @IsOptional() docWorkFiles?: any[];
  @IsOptional() docReplacement?: any[];
  @IsOptional() docAnswer?: any[];
  @IsOptional() typeOfProcess?: any[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowReceivers?: any[];
  @IsArray()
  @IsOptional()
  internalReceivingDept?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  internalReceivingDeptOld?: string[];

  @IsOptional()
  @IsArray()
  // @IsString({ each: true })
  processor?: any[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  signContentDraft?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  signFormatDraft?: string[];
  @IsBoolean()
  @IsOptional()
  fromCreateDraf?: boolean;

  @IsString() @IsOptional() signatureType?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) officialSigner1?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) paraphSigner?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) officialSigner2?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) officialSigner3?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) confirmer?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) appraiser?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) signStamp?: string[];
  @IsOptional() @Type(() => Boolean) @IsBoolean() isStamp?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() reqSignFormatDraft?: boolean;
}
