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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          created_at: string
          created_by: string
          dataset_id: string | null
          file_hash: string
          file_name: string
          id: string
          kpis: NonNullable<Json>
          name: string
          period_end: string
          period_month: string
          period_start: string
          quality_report: NonNullable<Json>
          result: NonNullable<Json>
          snapshot: NonNullable<Json>
          status: string
          superseded_by: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string
          dataset_id?: string | null
          file_hash: string
          file_name: string
          id?: string
          kpis?: NonNullable<Json>
          name?: string
          period_end: string
          period_month: string
          period_start: string
          quality_report?: NonNullable<Json>
          result?: NonNullable<Json>
          snapshot?: NonNullable<Json>
          status?: string
          superseded_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dataset_id?: string | null
          file_hash?: string
          file_name?: string
          id?: string
          kpis?: NonNullable<Json>
          name?: string
          period_end?: string
          period_month?: string
          period_start?: string
          quality_report?: NonNullable<Json>
          result?: NonNullable<Json>
          snapshot?: NonNullable<Json>
          status?: string
          superseded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_reports: {
        Row: {
          advance_cents: number
          analysis_id: string
          created_at: string
          created_by: string
          id: string
          inputs: NonNullable<Json>
          own_rate: number
          result: NonNullable<Json>
          seller_key: string
          team_rate: number
          version: number
          warnings: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          advance_cents?: number
          analysis_id: string
          created_at?: string
          created_by?: string
          id?: string
          inputs: NonNullable<Json>
          own_rate: number
          result: NonNullable<Json>
          seller_key: string
          team_rate: number
          version: number
          warnings?: NonNullable<Json>
        }
        Update: {
          advance_cents?: number
          analysis_id?: string
          created_at?: string
          created_by?: string
          id?: string
          inputs?: NonNullable<Json>
          own_rate?: number
          result?: NonNullable<Json>
          seller_key?: string
          team_rate?: number
          version?: number
          warnings?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: "commission_reports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          file_hash: string
          file_name: string
          id: string
          name: string
          period_end: string
          period_start: string
          row_count: number
          status: string
          storage_path: string | null
          uploaded_at: string
          uploaded_by: string
        }
        ComputedFields: never
        Insert: {
          file_hash: string
          file_name: string
          id?: string
          name: string
          period_end: string
          period_start: string
          row_count: number
          status?: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Update: {
          file_hash?: string
          file_name?: string
          id?: string
          name?: string
          period_end?: string
          period_start?: string
          row_count?: number
          status?: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      sale_lines: {
        Row: {
          client_key: string
          client_name: string
          cost_center: string
          created_at: string
          dataset_id: string
          date: string
          doc_type: string
          document_number: string
          family_key: string
          id: string
          is_product: boolean
          is_return: boolean
          item: string
          item_description: string
          line_no: number
          margin: number
          net_cents: number
          quantity: number
          seller_id: string
          seller_key: string
          seller_name: string
          status: string
          subtotal_cents: number
          unit: string
          warehouse: string
        }
        ComputedFields: never
        Insert: {
          client_key: string
          client_name: string
          cost_center: string
          created_at?: string
          dataset_id: string
          date: string
          doc_type: string
          document_number: string
          family_key: string
          id?: string
          is_product: boolean
          is_return: boolean
          item: string
          item_description: string
          line_no: number
          margin: number
          net_cents: number
          quantity: number
          seller_id: string
          seller_key: string
          seller_name: string
          status: string
          subtotal_cents: number
          unit: string
          warehouse: string
        }
        Update: {
          client_key?: string
          client_name?: string
          cost_center?: string
          created_at?: string
          dataset_id?: string
          date?: string
          doc_type?: string
          document_number?: string
          family_key?: string
          id?: string
          is_product?: boolean
          is_return?: boolean
          item?: string
          item_description?: string
          line_no?: number
          margin?: number
          net_cents?: number
          quantity?: number
          seller_id?: string
          seller_key?: string
          seller_name?: string
          status?: string
          subtotal_cents?: number
          unit?: string
          warehouse?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_dataset: {
        Args: { p_new_id: string; p_replace_ids: string[] }
        Returns: undefined
      }
      delete_analysis: {
        Args: { p_id: string }
        Returns: undefined
      }
      data_coverage: {
        Args: Record<PropertyKey, never>
        Returns: {
          datasets_ready: number
          first_date: string
          last_date: string
          last_upload_at: string
          missing_months: string[]
          months_with_data: number
        }[]
      }
      panel_summary: {
        Args: { p_from: string; p_to: string; p_seller_keys?: string[] }
        Returns: {
          avg_ticket_cents: number
          clients: number
          documents: number
          gross_sales_cents: number
          last_date: string
          net_sales_cents: number
          previous_last_date: string
          previous_net_sales_cents: number
          return_rate: number
          returns_cents: number
          weighted_margin: number
        }[]
      }
      sales_by_family: {
        Args: { p_from: string; p_limit?: number; p_seller_keys?: string[]; p_to: string }
        Returns: {
          cumulative_share: number
          documents: number
          key: string
          label: string
          margin: number
          net_sales_cents: number
          returns_cents: number
          share: number
        }[]
      }
      sales_by_month: {
        Args: { p_from: string; p_seller_keys?: string[]; p_to: string }
        Returns: {
          documents: number
          gross_sales_cents: number
          month: string
          net_sales_cents: number
          returns_cents: number
        }[]
      }
      sales_by_warehouse: {
        Args: { p_from: string; p_limit?: number; p_seller_keys?: string[]; p_to: string }
        Returns: {
          cumulative_share: number
          documents: number
          key: string
          label: string
          margin: number
          net_sales_cents: number
          returns_cents: number
          share: number
        }[]
      }
      top_clients: {
        Args: { p_from: string; p_limit?: number; p_seller_keys?: string[]; p_to: string }
        Returns: {
          cumulative_share: number
          documents: number
          key: string
          label: string
          margin: number
          net_sales_cents: number
          returns_cents: number
          share: number
        }[]
      }
      top_products: {
        Args: {
          p_from: string
          p_include_non_products?: boolean
          p_limit?: number
          p_metric?: string
          p_order?: string
          p_seller_keys?: string[]
          p_to: string
        }
        Returns: {
          cumulative_share: number
          documents: number
          key: string
          label: string
          margin: number
          net_sales_cents: number
          quantity: number
          returns_cents: number
          share: number
          unit: string
        }[]
      }
      top_sellers: {
        Args: { p_from: string; p_limit?: number; p_seller_keys?: string[]; p_to: string }
        Returns: {
          cumulative_share: number
          documents: number
          key: string
          label: string
          margin: number
          net_sales_cents: number
          returns_cents: number
          share: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
