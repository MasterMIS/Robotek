export interface Checklist {
  id: string;
  task: string;
  assigned_by: string;
  assigned_to: string;
  priority: string;
  department: string;
  verification_required: string;
  attachment_required: string;
  frequency: string;
  due_date: string;
  status: string;
  group_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistRevision {
  id: string;
  checklists_id: string;
  old_status: string;
  new_status: string;
  reason: string;
  created_at: string;
  evidence_urls: string;
}

export interface ChecklistRemark {
  id: string;
  checklists_id: string;
  user_id: string;
  username: string;
  remark: string;
  created_at: string;
}
