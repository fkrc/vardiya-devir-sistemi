export interface Field { key: string; label: string; type: string; options?: string[]; required?: boolean; dependsOn?: string; }
export interface Section { title: string; fields: Field[]; }
export interface FormSchema { sections: Section[]; }
export interface ShiftFormList { id: number; formTitle: string; unitName: string; status: string; recordDate: string; }
export interface CurrentUser { id: number; username: string; fullName: string; role: string; unit: string;}