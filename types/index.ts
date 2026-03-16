export interface UseCase {
  id: string
  title: string
  domain: string
  tag: string
  description: string
  status: 'live' | 'pilot' | 'poc'
  metric_1_label: string
  metric_1_value: string
  metric_1_sub: string
  metric_2_label: string
  metric_2_value: string
  metric_2_sub: string
  metric_3_label: string
  metric_3_value: string
  metric_3_sub: string
  tech_stack: string[]
  cmp_roi: number
  cmp_complexity: number
  cmp_data_req: number
  cmp_speed: number
  cmp_fit: number
  sharepoint_source_url?: string
}

export interface DocumentChunk {
  id: string
  content: string
  source_file_name: string
  source_url: string
  section_heading: string
  use_case_tag: string
  similarity?: number
}

export interface Session {
  id: string
  session_token: string
  email?: string
  company?: string
  role?: string
  messages_json: Message[]
  use_cases_viewed: string[]
  sow_generated: boolean
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface SOW {
  id: string
  session_id: string
  company: string
  contact_role: string
  document_type: string
  use_case_focus: string
  business_context: string
  timeline: string
  budget_range: string
  generated_content: string
}
