// Generated from the Supabase project schema. Regenerate after schema changes instead of editing.
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name: string
          created_at?: string
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          ends_on: string
          id: number
          name: string
          prize: string
          product_id: number | null
          starts_on: string
          target: number | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          ends_on: string
          id?: never
          name: string
          prize?: string
          product_id?: number | null
          starts_on: string
          target?: number | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          ends_on?: string
          id?: never
          name?: string
          prize?: string
          product_id?: number | null
          starts_on?: string
          target?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_events: {
        Row: {
          created_at: string
          id: number
          kind: string
          sale_id: number | null
          sub: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kind: string
          sale_id?: number | null
          sub?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string
          sale_id?: number | null
          sub?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          id: number
          name: string
          points: number
          price: number
          visible: boolean
        }
        Insert: {
          category?: string
          created_at?: string
          id?: never
          name: string
          points?: number
          price: number
          visible?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          id?: never
          name?: string
          points?: number
          price?: number
          visible?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          team_id: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: string
          team_id?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: string
          team_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancel_reason: string | null
          created_at: string
          id: number
          product_id: number
          qty: number
          resolved_at: string | null
          resolved_by: string | null
          status: string
          unit_points: number
          unit_price: number
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          created_at?: string
          id?: never
          product_id: number
          qty: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          unit_points: number
          unit_price: number
          user_id?: string
        }
        Update: {
          cancel_reason?: string | null
          created_at?: string
          id?: never
          product_id?: number
          qty?: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          unit_points?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          daily_goal: number
          id: boolean
          spin_every: number
        }
        Insert: {
          daily_goal?: number
          id?: boolean
          spin_every?: number
        }
        Update: {
          daily_goal?: number
          id?: boolean
          spin_every?: number
        }
        Relationships: []
      }
      spin_fields: {
        Row: {
          id: number
          is_win: boolean
          label: string
          position: number
          probability: number
        }
        Insert: {
          id?: never
          is_win?: boolean
          label: string
          position: number
          probability: number
        }
        Update: {
          id?: never
          is_win?: boolean
          label?: string
          position?: number
          probability?: number
        }
        Relationships: []
      }
      spins: {
        Row: {
          created_at: string
          field_id: number
          id: number
          label: string
          user_id: string
          won: boolean
        }
        Insert: {
          created_at?: string
          field_id: number
          id?: never
          label: string
          user_id: string
          won: boolean
        }
        Update: {
          created_at?: string
          field_id?: number
          id?: never
          label?: string
          user_id?: string
          won?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "spins_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "spin_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contest_standings: {
        Args: never
        Returns: {
          contest_id: number
          full_name: string
          user_id: string
          value: number
        }[]
      }
      leaderboard: {
        Args: { p_period?: string }
        Returns: {
          full_name: string
          points: number
          revenue: number
          sales: number
          team: string
          user_id: string
        }[]
      }
      my_stats: { Args: never; Returns: Json }
      product_sales: {
        Args: { p_period?: string }
        Returns: {
          name: string
          product_id: number
          units: number
        }[]
      }
      spin_status: {
        Args: never
        Returns: {
          available: number
          sold_today: number
          spin_every: number
        }[]
      }
      spin_wheel: {
        Args: never
        Returns: {
          field_id: number
          label: string
          slot: number
          won: boolean
        }[]
      }
      undo_sale: { Args: { p_sale_id: number }; Returns: undefined }
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
  public: {
    Enums: {},
  },
} as const
