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
      clubs: {
        Row: {
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          id: string
          inscription_fee: number | null
          logo_url: string | null
          monthly_fee: number | null
          name: string
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          inscription_fee?: number | null
          logo_url?: string | null
          monthly_fee?: number | null
          name: string
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          inscription_fee?: number | null
          logo_url?: string | null
          monthly_fee?: number | null
          name?: string
        }
        Relationships: []
      }
      member_invitations: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          club_id: string
          created_at: string
          id: string
          member_id: string
          role: Database["public"]["Enums"]["club_role"]
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          member_id: string
          role: Database["public"]["Enums"]["club_role"]
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          member_id?: string
          role?: Database["public"]["Enums"]["club_role"]
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          club_id: string
          created_at: string
          date_of_birth: string | null
          email: string
          enrollment_date: string
          full_name: string
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          identification: string | null
          medical_history: string | null
          member_type: string | null
          observations: string | null
          phone: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          club_id: string
          created_at?: string
          date_of_birth?: string | null
          email: string
          enrollment_date?: string
          full_name: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          identification?: string | null
          medical_history?: string | null
          member_type?: string | null
          observations?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          club_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string
          enrollment_date?: string
          full_name?: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          identification?: string | null
          medical_history?: string | null
          member_type?: string | null
          observations?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          club_id: string
          created_at: string
          detail: string | null
          division: string | null
          ends: Json
          event_name: string | null
          id: string
          member_id: string
          score_date: string
          target_type: string | null
          total_score: number
          training_session_id: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          detail?: string | null
          division?: string | null
          ends?: Json
          event_name?: string | null
          id?: string
          member_id: string
          score_date?: string
          target_type?: string | null
          total_score?: number
          training_session_id?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          detail?: string | null
          division?: string | null
          ends?: Json
          event_name?: string | null
          id?: string
          member_id?: string
          score_date?: string
          target_type?: string | null
          total_score?: number
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          club_id: string
          enrolled_at: string
          id: string
          member_id: string
          training_session_id: string
        }
        Insert: {
          club_id: string
          enrolled_at?: string
          id?: string
          member_id: string
          training_session_id: string
        }
        Update: {
          club_id?: string
          enrolled_at?: string
          id?: string
          member_id?: string
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          detail: string | null
          division: string | null
          event_date: string
          id: string
          name: string
          target_type: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          division?: string | null
          event_date?: string
          id?: string
          name: string
          target_type?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          division?: string | null
          event_date?: string
          id?: string
          name?: string
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          club_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string
        }[]
      }
      get_member_for_user: {
        Args: { p_user_id: string }
        Returns: {
          member_club_id: string
          member_id: string
          member_status: Database["public"]["Enums"]["member_status"]
        }[]
      }
      has_club_role: {
        Args: {
          p_club_id: string
          p_role: Database["public"]["Enums"]["club_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_active_member: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      is_club_admin: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      register_club: {
        Args: {
          p_admin_name: string
          p_city: string
          p_club_name: string
          p_contact_email: string
          p_country: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      club_role:
        | "arquero"
        | "socio"
        | "entrenador"
        | "presidente"
        | "administrador"
      member_status: "activo" | "inactivo"
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
      club_role: [
        "arquero",
        "socio",
        "entrenador",
        "presidente",
        "administrador",
      ],
      member_status: ["activo", "inactivo"],
    },
  },
} as const
