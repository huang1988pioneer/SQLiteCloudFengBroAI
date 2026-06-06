export type WorkspaceFieldType = "text" | "number" | "date" | "url" | "textarea";

export type WorkspaceField = {
  name: string;
  label: string;
  type: WorkspaceFieldType;
  required?: boolean;
  multiline?: boolean;
};

export type WorkspaceModule = {
  key: string;
  title: string;
  shortTitle: string;
  table: string;
  description: string;
  csvName: string;
  fields: WorkspaceField[];
  displayFields: string[];
};

export type WorkspaceRecord = {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};
