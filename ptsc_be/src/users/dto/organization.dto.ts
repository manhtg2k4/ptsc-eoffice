import { IsOptional, IsString, IsNumberString, IsIn } from 'class-validator';

export class OrganizationUnitsByFlowDto {
  @IsOptional()
  @IsString({ message: 'documentId phải là string' })
  documentId?: string;

  @IsOptional()
  @IsString({ message: 'processKey phải là string (bpmnVersionId hoặc processKey)' })
  processKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IncomingDocument', 'OutgoingDocument', 'incomingdocument', 'outgoingdocument'], {
    message: 'documentType không hợp lệ',
  })
  documentType?: string;

  /**
   * Phòng ban hiện tại (nếu FE truyền lên để lọc thêm)
   * Không bắt buộc theo logic service hiện tại
   */
  @IsOptional()
  @IsString({ message: 'unit phải là string' })
  unit?: string;

  @IsOptional()
  @IsString({ message: 'workitem phải là string (nodeId hiện tại)' })
  workitem?: string;

  @IsOptional()
  @IsString({ message: 'actionCode phải là string' })
  actionCode?: string;

  @IsOptional()
  @IsString({ message: 'roles phải là string (comma-separated)' })
  roles?: string;

  @IsOptional()
  @IsString({ message: 'type phải là string' })
  type?: string;

  @IsOptional()
  @IsString({ message: 'userId phải là string' })
  userId?: string;
}

