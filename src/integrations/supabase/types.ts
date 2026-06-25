export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_types: {
        Row: {
          additional_fields: boolean | null
          area_id: string | null
          bonus_points_with_professional: number | null
          classification: string
          created_at: string | null
          credit_validity_days: number | null
          credit_validity_type: string | null
          enabled_fields: string[] | null
          id: string
          impacts: string[] | null
          name: string
          points: number | null
          requires_value: string | null
        }
        Insert: {
          additional_fields?: boolean | null
          area_id?: string | null
          bonus_points_with_professional?: number | null
          classification: string
          created_at?: string | null
          credit_validity_days?: number | null
          credit_validity_type?: string | null
          enabled_fields?: string[] | null
          id?: string
          impacts?: string[] | null
          name: string
          points?: number | null
          requires_value?: string | null
        }
        Update: {
          additional_fields?: boolean | null
          area_id?: string | null
          bonus_points_with_professional?: number | null
          classification?: string
          created_at?: string | null
          credit_validity_days?: number | null
          credit_validity_type?: string | null
          enabled_fields?: string[] | null
          id?: string
          impacts?: string[] | null
          name?: string
          points?: number | null
          requires_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_types_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          action_date: string
          action_type_id: string | null
          client_age: number | null
          client_name: string | null
          client_profession: string | null
          consultant_id: string | null
          created_at: string | null
          environment_count: number | null
          focco_project_number: string | null
          id: string
          notes: string | null
          presentation_number: string | null
          professional_id: string | null
          project_id: string | null
          sales_channel: string | null
          value: number | null
        }
        Insert: {
          action_date: string
          action_type_id?: string | null
          client_age?: number | null
          client_name?: string | null
          client_profession?: string | null
          consultant_id?: string | null
          created_at?: string | null
          environment_count?: number | null
          focco_project_number?: string | null
          id?: string
          notes?: string | null
          presentation_number?: string | null
          professional_id?: string | null
          project_id?: string | null
          sales_channel?: string | null
          value?: number | null
        }
        Update: {
          action_date?: string
          action_type_id?: string | null
          client_age?: number | null
          client_name?: string | null
          client_profession?: string | null
          consultant_id?: string | null
          created_at?: string | null
          environment_count?: number | null
          focco_project_number?: string | null
          id?: string
          notes?: string | null
          presentation_number?: string | null
          professional_id?: string | null
          project_id?: string | null
          sales_channel?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_planner_apresentacao"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      at_action_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      checklist_attachments: {
        Row: {
          checklist_item_id: string
          created_at: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          checklist_item_id: string
          created_at?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          checklist_item_id?: string
          created_at?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_attachments_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_history: {
        Row: {
          action: string
          checklist_item_id: string
          created_at: string | null
          id: string
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          checklist_item_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          checklist_item_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_history_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          assigned_to: string | null
          checklist_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          due_date: string | null
          environment_count: number | null
          extra_data: Json
          id: string
          name: string
          notes: string | null
          responsible_area: string
          status: string | null
          step_order: number
          template_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          checklist_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          environment_count?: number | null
          extra_data?: Json
          id?: string
          name: string
          notes?: string | null
          responsible_area: string
          status?: string | null
          step_order: number
          template_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          checklist_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          environment_count?: number | null
          extra_data?: Json
          id?: string
          name?: string
          notes?: string | null
          responsible_area?: string
          status?: string | null
          step_order?: number
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "contract_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string | null
          default_sla_days: number | null
          id: string
          is_active: boolean | null
          name: string
          points_per_environment: number | null
          responsible_area: string
          step_order: number
          workflow_status: Database["public"]["Enums"]["contract_workflow_status"]
        }
        Insert: {
          created_at?: string | null
          default_sla_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          points_per_environment?: number | null
          responsible_area: string
          step_order: number
          workflow_status: Database["public"]["Enums"]["contract_workflow_status"]
        }
        Update: {
          created_at?: string | null
          default_sla_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_per_environment?: number | null
          responsible_area?: string
          step_order?: number
          workflow_status?: Database["public"]["Enums"]["contract_workflow_status"]
        }
        Relationships: []
      }
      client_interactions: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          interaction_date: string | null
          interaction_type: string
          team_member_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          interaction_date?: string | null
          interaction_type: string
          team_member_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          interaction_date?: string | null
          interaction_type?: string
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          age: number | null
          city: string | null
          contract_number: string | null
          cpf_cnpj: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          origin_type: string | null
          phone: string | null
          potential_value: number | null
          preferences: string | null
          profession: string | null
          professional_id: string | null
          responsible_id: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          city?: string | null
          contract_number?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          origin_type?: string | null
          phone?: string | null
          potential_value?: number | null
          preferences?: string | null
          profession?: string | null
          professional_id?: string | null
          responsible_id?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          city?: string | null
          contract_number?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          origin_type?: string | null
          phone?: string | null
          potential_value?: number | null
          preferences?: string | null
          profession?: string | null
          professional_id?: string | null
          responsible_id?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_checklists: {
        Row: {
          assigned_apresentacao_projetista_id: string | null
          assigned_cs_id: string | null
          assigned_logistica_id: string | null
          assigned_projetista_id: string | null
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          is_completed: boolean | null
          project_id: string
          updated_at: string | null
          workflow_status:
            | Database["public"]["Enums"]["contract_workflow_status"]
            | null
        }
        Insert: {
          assigned_apresentacao_projetista_id?: string | null
          assigned_cs_id?: string | null
          assigned_logistica_id?: string | null
          assigned_projetista_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          is_completed?: boolean | null
          project_id: string
          updated_at?: string | null
          workflow_status?:
            | Database["public"]["Enums"]["contract_workflow_status"]
            | null
        }
        Update: {
          assigned_apresentacao_projetista_id?: string | null
          assigned_cs_id?: string | null
          assigned_logistica_id?: string | null
          assigned_projetista_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          is_completed?: boolean | null
          project_id?: string
          updated_at?: string | null
          workflow_status?:
            | Database["public"]["Enums"]["contract_workflow_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_checklists_assigned_apresentacao_projetista_id_fkey"
            columns: ["assigned_apresentacao_projetista_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_checklists_assigned_cs_id_fkey"
            columns: ["assigned_cs_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_checklists_assigned_logistica_id_fkey"
            columns: ["assigned_logistica_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_checklists_assigned_projetista_id_fkey"
            columns: ["assigned_projetista_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "vw_planner_apresentacao"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          action_id: string | null
          checklist_item_id: string | null
          consultant_id: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          points: number
          professional_id: string | null
          status: string | null
          transaction_date: string | null
        }
        Insert: {
          action_id?: string | null
          checklist_item_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          points: number
          professional_id?: string | null
          status?: string | null
          transaction_date?: string | null
        }
        Update: {
          action_id?: string | null
          checklist_item_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          points?: number
          professional_id?: string | null
          status?: string | null
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_action_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      cs_actions: {
        Row: {
          action_type_id: string | null
          completed_date: string | null
          created_at: string | null
          cs_case_id: string
          id: string
          notes: string | null
          performed_by: string | null
          schedule_id: string | null
          scheduled_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          action_type_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          cs_case_id: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          schedule_id?: string | null
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          cs_case_id?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          schedule_id?: string | null
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_actions_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "cs_action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_actions_cs_case_id_fkey"
            columns: ["cs_case_id"]
            isOneToOne: false
            referencedRelation: "cs_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_actions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_actions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "cs_contact_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_cases: {
        Row: {
          client_id: string | null
          contract_number: string
          created_at: string | null
          id: string
          notes: string | null
          project_id: string | null
          responsible_id: string | null
          signature_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          contract_number: string
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          responsible_id?: string | null
          signature_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          contract_number?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          responsible_id?: string | null
          signature_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_planner_apresentacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_cases_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_contact_schedules: {
        Row: {
          created_at: string | null
          days_after_signature: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          days_after_signature: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          days_after_signature?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      customer_success: {
        Row: {
          client_id: string | null
          created_at: string | null
          health_score: number | null
          id: string
          last_contact_date: string | null
          next_contact_date: string | null
          notes: string | null
          project_id: string | null
          responsible_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          last_contact_date?: string | null
          next_contact_date?: string | null
          notes?: string | null
          project_id?: string | null
          responsible_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          last_contact_date?: string | null
          next_contact_date?: string | null
          notes?: string | null
          project_id?: string | null
          responsible_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_success_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_planner_apresentacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          area_id: string | null
          category_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          metric: string
          sales_channel: string | null
          start_date: string | null
          team_member_id: string | null
          validity_type: string | null
          value: number
        }
        Insert: {
          area_id?: string | null
          category_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          metric: string
          sales_channel?: string | null
          start_date?: string | null
          team_member_id?: string | null
          validity_type?: string | null
          value?: number
        }
        Update: {
          area_id?: string | null
          category_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          metric?: string
          sales_channel?: string | null
          start_date?: string | null
          team_member_id?: string | null
          validity_type?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "professional_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_start_approvals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by_user_id: string | null
          decision_reason: string | null
          id: string
          project_id: string
          reason: string | null
          requested_by_team_member_id: string | null
          requested_by_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          decision_reason?: string | null
          id?: string
          project_id: string
          reason?: string | null
          requested_by_team_member_id?: string | null
          requested_by_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          decision_reason?: string | null
          id?: string
          project_id?: string
          reason?: string | null
          requested_by_team_member_id?: string | null
          requested_by_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_start_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_start_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_planner_apresentacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_start_approvals_requested_by_team_member_id_fkey"
            columns: ["requested_by_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      position_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
          position_id: string
          resource: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
          position_id: string
          resource: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
          position_id?: string
          resource?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_permissions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          area: Database["public"]["Enums"]["functional_area"]
          area_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          area: Database["public"]["Enums"]["functional_area"]
          area_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          area?: Database["public"]["Enums"]["functional_area"]
          area_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_categories: {
        Row: {
          condition: string
          created_at: string | null
          days: number
          hierarchy: number
          id: string
          name: string
          points: number | null
        }
        Insert: {
          condition: string
          created_at?: string | null
          days: number
          hierarchy?: number
          id?: string
          name: string
          points?: number | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          days?: number
          hierarchy?: number
          id?: string
          name?: string
          points?: number | null
        }
        Relationships: []
      }
      professional_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          category_id: string | null
          consultant_id: string | null
          created_at: string | null
          id: string
          is_manual_category: boolean | null
          last_action_date: string | null
          last_action_type_id: string | null
          name: string
          type_id: string | null
        }
        Insert: {
          category_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          is_manual_category?: boolean | null
          last_action_date?: string | null
          last_action_type_id?: string | null
          name: string
          type_id?: string | null
        }
        Update: {
          category_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          is_manual_category?: boolean | null
          last_action_date?: string | null
          last_action_type_id?: string | null
          name?: string
          type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "professional_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_last_action_type_id_fkey"
            columns: ["last_action_type_id"]
            isOneToOne: false
            referencedRelation: "action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "professional_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deletion_audit: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_by: string | null
          deleted_at: string
          deleted_by_team_member_id: string | null
          deleted_by_user_id: string | null
          estimated_value: number | null
          focco_project_number: string | null
          id: string
          origin_type: string | null
          planner_status: string | null
          project_created_at: string | null
          project_id: string
          project_name: string | null
          project_snapshot: Json | null
          project_updated_at: string | null
          responsible_id: string | null
          stage: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_by?: string | null
          deleted_at?: string
          deleted_by_team_member_id?: string | null
          deleted_by_user_id?: string | null
          estimated_value?: number | null
          focco_project_number?: string | null
          id?: string
          origin_type?: string | null
          planner_status?: string | null
          project_created_at?: string | null
          project_id: string
          project_name?: string | null
          project_snapshot?: Json | null
          project_updated_at?: string | null
          responsible_id?: string | null
          stage?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_by?: string | null
          deleted_at?: string
          deleted_by_team_member_id?: string | null
          deleted_by_user_id?: string | null
          estimated_value?: number | null
          focco_project_number?: string | null
          id?: string
          origin_type?: string | null
          planner_status?: string | null
          project_created_at?: string | null
          project_id?: string
          project_name?: string | null
          project_snapshot?: Json | null
          project_updated_at?: string | null
          responsible_id?: string | null
          stage?: string | null
        }
        Relationships: []
      }
      project_environments: {
        Row: {
          action_id: string | null
          checklist_item_id: string | null
          competence_month: string
          consultant_id: string | null
          created_at: string
          environment_count: number
          environment_type: string
          id: string
          notes: string | null
          project_id: string | null
          projetista_id: string
          updated_at: string
        }
        Insert: {
          action_id?: string | null
          checklist_item_id?: string | null
          competence_month: string
          consultant_id?: string | null
          created_at?: string
          environment_count?: number
          environment_type: string
          id?: string
          notes?: string | null
          project_id?: string | null
          projetista_id: string
          updated_at?: string
        }
        Update: {
          action_id?: string | null
          checklist_item_id?: string | null
          competence_month?: string
          consultant_id?: string | null
          created_at?: string
          environment_count?: number
          environment_type?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          projetista_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_environments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_environments_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_environments_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_environments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_environments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_planner_apresentacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_environments_projetista_id_fkey"
            columns: ["projetista_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_review_snoozes: {
        Row: {
          created_at: string
          id: string
          project_id: string
          snoozed_by: string
          snoozed_until: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          snoozed_by: string
          snoozed_until: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          snoozed_by?: string
          snoozed_until?: string
        }
        Relationships: []
      }
      project_value_history: {
        Row: {
          action_id: string | null
          consultant_id: string | null
          created_at: string
          id: string
          notes: string | null
          presented_value: number
          project_id: string
        }
        Insert: {
          action_id?: string | null
          consultant_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          presented_value: number
          project_id: string
        }
        Update: {
          action_id?: string | null
          consultant_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          presented_value?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_value_history_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_value_history_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_value_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_value_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_planner_apresentacao"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_delivery: string | null
          apresentacao_projetista_id: string | null
          client_id: string | null
          closed_date: string | null
          closed_value: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_value: number | null
          expected_delivery: string | null
          focco_project_number: string | null
          id: string
          name: string
          notes: string | null
          origin_action_id: string | null
          origin_type: string | null
          planner_data_aguardando: string | null
          planner_data_concluido: string | null
          planner_data_iniciado: string | null
          planner_data_pausado: string | null
          planner_data_perdido: string | null
          planner_data_vendido: string | null
          planner_link: string | null
          planner_motivo_perda: string | null
          planner_observacao: string | null
          planner_status: string | null
          planner_status_at: string | null
          professional_id: string | null
          responsible_id: string | null
          stage: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery?: string | null
          apresentacao_projetista_id?: string | null
          client_id?: string | null
          closed_date?: string | null
          closed_value?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_value?: number | null
          expected_delivery?: string | null
          focco_project_number?: string | null
          id?: string
          name: string
          notes?: string | null
          origin_action_id?: string | null
          origin_type?: string | null
          planner_data_aguardando?: string | null
          planner_data_concluido?: string | null
          planner_data_iniciado?: string | null
          planner_data_pausado?: string | null
          planner_data_perdido?: string | null
          planner_data_vendido?: string | null
          planner_link?: string | null
          planner_motivo_perda?: string | null
          planner_observacao?: string | null
          planner_status?: string | null
          planner_status_at?: string | null
          professional_id?: string | null
          responsible_id?: string | null
          stage?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery?: string | null
          apresentacao_projetista_id?: string | null
          client_id?: string | null
          closed_date?: string | null
          closed_value?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_value?: number | null
          expected_delivery?: string | null
          focco_project_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          origin_action_id?: string | null
          origin_type?: string | null
          planner_data_aguardando?: string | null
          planner_data_concluido?: string | null
          planner_data_iniciado?: string | null
          planner_data_pausado?: string | null
          planner_data_perdido?: string | null
          planner_data_vendido?: string | null
          planner_link?: string | null
          planner_motivo_perda?: string | null
          planner_observacao?: string | null
          planner_status?: string | null
          planner_status_at?: string | null
          professional_id?: string | null
          responsible_id?: string | null
          stage?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_apresentacao_projetista_id_fkey"
            columns: ["apresentacao_projetista_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          consultant_id: string | null
          created_at: string | null
          id: string
          recurrence: string | null
          reminder_date: string
          title: string
        }
        Insert: {
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          recurrence?: string | null
          reminder_date: string
          title: string
        }
        Update: {
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          recurrence?: string | null
          reminder_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cost: number
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          cost?: number
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          cost?: number
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      special_dates: {
        Row: {
          created_at: string | null
          date_value: string
          id: string
          professional_id: string | null
          reason: string | null
          recurrence: string | null
        }
        Insert: {
          created_at?: string | null
          date_value: string
          id?: string
          professional_id?: string | null
          reason?: string | null
          recurrence?: string | null
        }
        Update: {
          created_at?: string | null
          date_value?: string
          id?: string
          professional_id?: string | null
          reason?: string | null
          recurrence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_dates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      store_cleanliness_checks: {
        Row: {
          checked_at: string
          created_at: string
          id: string
          notes: string | null
          photos: string[]
          rating: number
          team_member_id: string
          week_start: string
        }
        Insert: {
          checked_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          photos?: string[]
          rating: number
          team_member_id: string
          week_start?: string
        }
        Update: {
          checked_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          photos?: string[]
          rating?: number
          team_member_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_cleanliness_checks_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      team_member_positions: {
        Row: {
          assigned_at: string | null
          id: string
          position_id: string
          team_member_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          position_id: string
          team_member_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          position_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_positions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_positions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active: boolean | null
          area_id: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          area_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          area_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_assistance: {
        Row: {
          action_type_id: string | null
          attended_by: string | null
          client_id: string | null
          completed_date: string | null
          contact_date: string | null
          contract_number: string | null
          cost_value: number | null
          created_at: string | null
          description: string | null
          generated_revenue: boolean | null
          id: string
          opened_date: string | null
          priority: string | null
          project_id: string | null
          resolution_notes: string | null
          responsible_id: string | null
          sale_value: number | null
          scheduled_date: string | null
          solution_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          visit_date: string | null
        }
        Insert: {
          action_type_id?: string | null
          attended_by?: string | null
          client_id?: string | null
          completed_date?: string | null
          contact_date?: string | null
          contract_number?: string | null
          cost_value?: number | null
          created_at?: string | null
          description?: string | null
          generated_revenue?: boolean | null
          id?: string
          opened_date?: string | null
          priority?: string | null
          project_id?: string | null
          resolution_notes?: string | null
          responsible_id?: string | null
          sale_value?: number | null
          scheduled_date?: string | null
          solution_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          visit_date?: string | null
        }
        Update: {
          action_type_id?: string | null
          attended_by?: string | null
          client_id?: string | null
          completed_date?: string | null
          contact_date?: string | null
          contract_number?: string | null
          cost_value?: number | null
          created_at?: string | null
          description?: string | null
          generated_revenue?: boolean | null
          id?: string
          opened_date?: string | null
          priority?: string | null
          project_id?: string | null
          resolution_notes?: string | null
          responsible_id?: string | null
          sale_value?: number | null
          scheduled_date?: string | null
          solution_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_assistance_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "at_action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assistance_attended_by_fkey"
            columns: ["attended_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assistance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assistance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assistance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_planner_apresentacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assistance_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_area_assignments: {
        Row: {
          area_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_area_assignments_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_areas: {
        Row: {
          area: Database["public"]["Enums"]["functional_area"]
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          area: Database["public"]["Enums"]["functional_area"]
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          area?: Database["public"]["Enums"]["functional_area"]
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_planner_apresentacao: {
        Row: {
          apresentacao_projetista_id: string | null
          client_id: string | null
          cliente_nome: string | null
          consultor_nome: string | null
          contract_number: string | null
          data_captacao: string | null
          id: string | null
          name: string | null
          planner_data_aguardando: string | null
          planner_data_concluido: string | null
          planner_data_iniciado: string | null
          planner_data_perdido: string | null
          planner_data_vendido: string | null
          planner_dias_aguardando: number | null
          planner_dias_ate_aguardando: number | null
          planner_dias_iniciado: number | null
          planner_status: string | null
          project_status: string | null
          projetista_nome: string | null
          qtd_ambientes: number | null
          responsible_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_apresentacao_projetista_id_fkey"
            columns: ["apresentacao_projetista_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      expire_pausado_projects: { Args: never; Returns: number }
      get_current_team_member_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated: { Args: never; Returns: boolean }
      user_has_area: {
        Args: {
          _area: Database["public"]["Enums"]["functional_area"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["permission_type"]
          _resource: string
          _user_id: string
        }
        Returns: boolean
      }
      user_has_position_area: {
        Args: {
          _area: Database["public"]["Enums"]["functional_area"]
          _user_id: string
        }
        Returns: boolean
      }
      week_start_monday: { Args: { d: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      contract_workflow_status:
        | "formalizacao"
        | "desenvolvimento_tecnico"
        | "aprovacao_comercial"
        | "implantacao_tecnica"
        | "logistica_entrega"
        | "encerramento_cs"
        | "encerrado"
      functional_area:
        | "comercial"
        | "projetos"
        | "customer_success"
        | "assistencia_tecnica"
      permission_type: "view" | "create" | "edit" | "delete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      contract_workflow_status: [
        "formalizacao",
        "desenvolvimento_tecnico",
        "aprovacao_comercial",
        "implantacao_tecnica",
        "logistica_entrega",
        "encerramento_cs",
        "encerrado",
      ],
      functional_area: [
        "comercial",
        "projetos",
        "customer_success",
        "assistencia_tecnica",
      ],
      permission_type: ["view", "create", "edit", "delete"],
    },
  },
} as const
