export type UserRole = 'ADMIN' | 'REVIEWER' | 'DATA_ENTRY';

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type FieldType = 
  | 'NUMBER'
  | 'DECIMAL'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'RATIO'
  | 'TEXT'
  | 'TEXTAREA'
  | 'BOOLEAN'
  | 'MULTI_SELECT'
  | 'FILE';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
  createdAt: string;
}

export interface YearInfo {
  id: string;
  code: string; // '2023-24', '2024-25', '2025-26'
  displayOrder: number;
}

export interface FieldValidationRules {
  min?: number;
  max?: number;
  decimals?: number;
  allowNegative?: boolean;
  requiredProof?: boolean;
  suggestedValues?: string[];
  options?: string[];
  formula?: string; // e.g. "ratio" or "percentage_of_total"
  relatedFieldCode?: string;
}

export interface FieldDefinition {
  id: string;
  sectionId: string;
  code: string; // '3.1.1', '3.4.2', etc.
  label: string;
  description?: string;
  fieldType: FieldType;
  unit?: string;
  required: boolean;
  proofRequired: boolean;
  remarksAllowed: boolean;
  validationRules?: FieldValidationRules;
  displayOrder: number;
  active: boolean;
}

export interface SectionDefinition {
  id: string;
  attributeId: string;
  code: string; // '3.1', '3.2', etc.
  title: string;
  description?: string;
  displayOrder: number;
  active: boolean;
  fields: FieldDefinition[];
}

export interface AttributeDefinition {
  id: string;
  code: string; // '3'
  title: string;
  description?: string;
  version: number;
  active: boolean;
  sections: SectionDefinition[];
}

export interface DocumentInfo {
  id: string;
  submissionId: string;
  fieldId: string;
  fieldCode: string;
  yearId?: string | null;
  yearCode?: string | null;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploadedBy: string;
  uploaderName?: string;
  uploadedAt: string;
}

export interface SubmissionValueItem {
  fieldId: string;
  fieldCode: string;
  yearId: string;
  yearCode: string;
  isNotApplicable: boolean;
  numericValue?: number | null;
  textValue?: string | null;
  ratioNumerator?: number | null;
  ratioDenominator?: number | null;
  remarks?: string | null;
}

export interface SubmissionProgress {
  totalRequiredFields: number;
  completedRequiredFields: number;
  overallPercentage: number;
  sectionProgress: {
    sectionCode: string;
    sectionTitle: string;
    totalFields: number;
    completedFields: number;
    percentage: number;
    missingFieldCodes: string[];
  }[];
  documentsCount: number;
  missingRequiredProofs: {
    fieldCode: string;
    yearCode?: string;
    label: string;
  }[];
}

export interface SubmissionDetail {
  id: string;
  organizationId: string;
  organizationName: string;
  attributeId: string;
  attributeCode: string;
  attributeTitle: string;
  status: SubmissionStatus;
  createdBy: string;
  createdByName: string;
  submittedBy?: string | null;
  submittedByName?: string | null;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  values: SubmissionValueItem[];
  documents: DocumentInfo[];
  comments?: ReviewCommentItem[];
  progress?: SubmissionProgress;
}

export interface ReviewCommentItem {
  id: string;
  submissionId: string;
  sectionCode?: string | null;
  fieldCode?: string | null;
  comment: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  timestamp: string;
}
