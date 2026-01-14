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
          classification: string
          created_at: string | null
          credit_validity_days: number | null
          credit_validity_type: string | null
          id: string
          impacts: string[] | null
          name: string
          points: number | null
          requires_value: boolean | null
        }
        Insert: {
          additional_fields?: boolean | null
          classification: string
          created_at?: string | null
          credit_validity_days?: number | null
          credit_validity_type?: string | null
          id?: string
          impacts?: string[] | null
          name: string
          points?: number | null
          requires_value?: boolean | null
        }
        Update: {
          additional_fields?: boolean | null
          classification?: string
          created_at?: string | null
          credit_validity_days?: number | null
          credit_validity_type?: string | null
          id?: string
          impacts?: string[] | null
          name?: string
          points?: number | null
          requires_value?: boolean | null
        }
        Relationships: []
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
          id: string
          notes: string | null
          presentation_number: string | null
          professional_id: string | null
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
          id?: string
          notes?: string | null
          presentation_number?: string | null
          professional_id?: string | null
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
          id?: string
          notes?: string | null
          presentation_number?: string | null
          professional_id?: string | null
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
      credit_transactions: {
        Row: {
          action_id: string | null
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
      goals: {
        Row: {
          area_id: string | null
          category_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          metric: string
          start_date: string | null
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
          start_date?: string | null
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
          start_date?: string | null
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
      team_members: {
        Row: {
          active: boolean | null
          area_id: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          area_id?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          area_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
