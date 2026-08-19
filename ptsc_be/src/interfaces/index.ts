import { Types } from 'mongoose';
interface QueryParams {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  [key: string]: unknown;
  parent?: string;
}

interface EnterpriseInterFace {
  statusEnterprise: number;
  charterCapital: number;
  establishmentDate: string | Date;
  licenseIssueDate: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  [key: string]: unknown;
}

interface FamilyMember {
  fullName?: string;
  birthDate?: string | Date;
  relationship?: string;
  address?: string;
}

interface CitizenInterFace {
  citizenId?: string;
  fullName?: string;
  birthDate?: string | Date;
  idCard?: string;
  nationality?: string;
  phone?: string;
  email?: string;
  permanentAddress?: string;
  currentAddress?: string;
  ethnicity?: string;
  educationLevel?: string;
  placeOfBirth?: string;
  hometown?: string;
  otherNationality?: string;
  occupation?: string;
  maritalStatus?: string;
  otherNames?: string[];
  idCardIssueDate?: string | Date;
  issuedBy?: string;
  religion?: string;
  workplace?: string;
  spouseName?: string;
  familyInfo?: FamilyMember[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface ManagementUnit {
  _id: Types.ObjectId;
  name: string;
}

interface IntegrationManagementInterFace {
  managementUnit: Types.ObjectId | ManagementUnit; // 👉 Có thể là ObjectId hoặc Object chứa name
  apiList: Types.ObjectId[];
  statusActive: number | string;
  [key: string]: unknown;
}

interface ValidationResult {
  success: boolean;
  message?: string;
  data?: any | null;
}
//
interface DocumentCategory {
  _id: Types.ObjectId;
  name: string;
}

interface FileManager {
  _id: Types.ObjectId;
  name: string;
  nameRoot: string;
  username: string;
  path: string;
  realPath: string;
  fullPath: string;
  clientId: string;
  realName: string;
  parentPath: string;
  mimetype: string;
  description: string;
  mid: Types.ObjectId;
  type: string;
  size: number;
  isFile: boolean;
 
}

interface ExploitationUnit {
  _id: Types.ObjectId;
  unitname: string;
}

interface DataEntryFormPopulated {
  _id: Types.ObjectId;
  code: string;
  title: string;
  status: number | string;
  documentType?: DocumentCategory | Types.ObjectId;
  unitName?: ExploitationUnit | Types.ObjectId;
  fileId?: FileManager | Types.ObjectId;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  errorMessage?: string;
}

export {
  EnterpriseInterFace,
  FamilyMember,
  CitizenInterFace,
  QueryParams,
  IntegrationManagementInterFace,
  ValidationResult,
  DocumentCategory,
  DataEntryFormPopulated,
  FileManager,
  ExploitationUnit,
  ManagementUnit,
  DateRange
};
