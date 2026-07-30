export interface Field { key: string; label: string; type: string; options?: string[]; required?: boolean; dependsOn?: string; }
export interface Section { title: string; fields: Field[]; }
export interface FormSchema { sections: Section[]; }
export interface ShiftFormList { id: number; formTitle: string; menuKey?: string; unitName: string; status: string; recordDate: string; createdById?: number | null; createdByName?: string | null; }
export interface CurrentUser { id: number; username: string; fullName: string; role: string; unit: string;}
export interface FieldHistoryEntry { value: string; recordDate: string; unitName: string | null; }
export interface Attachment { id: number; fileName: string; contentType: string | null; fileSize: number | null; uploadedAt: string; }