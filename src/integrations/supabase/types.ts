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
          allow_superadmin_finances: boolean | null
          billing_cycle: string | null
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string | null
          id: string
          inscription_fee: number | null
          logo_url: string | null
          monthly_fee: number | null
          monthly_price: number | null
          name: string
          plan_id: string | null
          subscription_end_date: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          financial_support_expires_at: string | null
          block_type: string | null
          grace_period_days: number | null
          last_payment_date: string | null
          next_payment_due_date: string | null
          student_limit_override: number | null
        }
        Insert: {
          allow_superadmin_finances?: boolean | null
          billing_cycle?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          inscription_fee?: number | null
          logo_url?: string | null
          monthly_fee?: number | null
          monthly_price?: number | null
          name: string
          plan_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          financial_support_expires_at?: string | null
          block_type?: string | null
          grace_period_days?: number | null
          last_payment_date?: string | null
          next_payment_due_date?: string | null
          student_limit_override?: number | null
        }
        Update: {
          allow_superadmin_finances?: boolean | null
          billing_cycle?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          inscription_fee?: number | null
          logo_url?: string | null
          monthly_fee?: number | null
          monthly_price?: number | null
          name?: string
          plan_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          financial_support_expires_at?: string | null
          block_type?: string | null
          grace_period_days?: number | null
          last_payment_date?: string | null
          next_payment_due_date?: string | null
          student_limit_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invoices: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          club_id: string
          created_at: string | null
          id: string
          mercadopago_payment_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          club_id: string
          created_at?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          club_id?: string
          created_at?: string | null
          id?: string
          mercadopago_payment_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_invoices_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          club_id: string | null
          created_at: string | null
          id: string
          member_id: string | null
          message: string
          status: string | null
          type: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          message: string
          status?: string | null
          type: string
        }
        Update: {
          club_id?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          message?: string
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      division_change_notifications: {
        Row: {
          acknowledged_at: string | null
          change_date: string
          created_at: string
          id: string
          member_id: string
          new_division_id: string
          notified_at: string | null
          old_division_id: string | null
          reason: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          change_date?: string
          created_at?: string
          id?: string
          member_id: string
          new_division_id: string
          notified_at?: string | null
          old_division_id?: string | null
          reason?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          change_date?: string
          created_at?: string
          id?: string
          member_id?: string
          new_division_id?: string
          notified_at?: string | null
          old_division_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "division_change_notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_change_notifications_new_division_id_fkey"
            columns: ["new_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_change_notifications_old_division_id_fkey"
            columns: ["old_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          abbreviation: string
          active: boolean
          club_id: string | null
          created_at: string
          description: string | null
          gender: string | null
          id: string
          is_system: boolean
          max_age: number | null
          min_age: number | null
          name: string
        }
        Insert: {
          abbreviation: string
          active?: boolean
          club_id?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          is_system?: boolean
          max_age?: number | null
          min_age?: number | null
          name: string
        }
        Update: {
          abbreviation?: string
          active?: boolean
          club_id?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          is_system?: boolean
          max_age?: number | null
          min_age?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divisions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_charges: {
        Row: {
          amount: number
          charge_date: string | null
          club_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          amount: number
          charge_date?: string | null
          club_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          amount?: number
          charge_date?: string | null
          club_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_charges_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_charges_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          category: string
          club_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          id: string
          member_id: string | null
          payment_month: number | null
          payment_year: number | null
          receipt_url: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          club_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          member_id?: string | null
          payment_month?: number | null
          payment_year?: number | null
          receipt_url?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          member_id?: string | null
          payment_month?: number | null
          payment_year?: number | null
          receipt_url?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_divisions: {
        Row: {
          created_at: string
          division_id: string
          id: string
          is_primary: boolean
          member_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          division_id: string
          id?: string
          is_primary?: boolean
          member_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          division_id?: string
          id?: string
          is_primary?: boolean
          member_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_divisions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_divisions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
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
          max_uses: number | null
          invitation_type: string | null
          title: string | null
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
          max_uses?: number | null
          invitation_type?: string | null
          title?: string | null
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
          max_uses?: number | null
          invitation_type?: string | null
          title?: string | null
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
            foreignKeyName: "member_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
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
          created_at: string | null
          id: string
          member_id: string
          role: Database["public"]["Enums"]["club_role"]
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          member_id: string
          role: Database["public"]["Enums"]["club_role"]
        }
        Update: {
          club_id?: string
          created_at?: string | null
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
            foreignKeyName: "member_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
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
          avatar_url: string | null
          billing_day: number | null
          club_id: string | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          enrollment_date: string | null
          full_name: string
          grace_days: number | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          identification: string | null
          ifaa_number: string | null
          is_super_admin: boolean | null
          medical_history: string | null
          observations: string | null
          phone: string | null
          shirt_gender: string | null
          shirt_size: string | null
          status: Database["public"]["Enums"]["member_status"] | null
          user_id: string | null
          windbreaker_size: string | null
          invitation_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          billing_day?: number | null
          club_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrollment_date?: string | null
          full_name: string
          grace_days?: number | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          identification?: string | null
          ifaa_number?: string | null
          is_super_admin?: boolean | null
          medical_history?: string | null
          observations?: string | null
          phone?: string | null
          shirt_gender?: string | null
          shirt_size?: string | null
          status?: Database["public"]["Enums"]["member_status"] | null
          user_id?: string | null
          windbreaker_size?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          billing_day?: number | null
          club_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrollment_date?: string | null
          full_name?: string
          grace_days?: number | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          identification?: string | null
          ifaa_number?: string | null
          is_super_admin?: boolean | null
          medical_history?: string | null
          observations?: string | null
          phone?: string | null
          shirt_gender?: string | null
          shirt_size?: string | null
          status?: Database["public"]["Enums"]["member_status"] | null
          user_id?: string | null
          windbreaker_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          price_annual: number | null
          student_limit: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          price_annual?: number | null
          student_limit?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          price_annual?: number | null
          student_limit?: number | null
        }
        Relationships: []
      }
      scores: {
        Row: {
          club_id: string
          created_at: string
          detail: string | null
          division: string | null
          division_id: string | null
          ends: Json
          event_name: string | null
          id: string
          member_id: string
          old_division: string | null
          old_target_type: string | null
          score_date: string
          target_type: string | null
          total_score: number
          tournament_type_id: string | null
          training_session_id: string | null
          x_count: number | null
        }
        Insert: {
          club_id: string
          created_at?: string
          detail?: string | null
          division?: string | null
          division_id?: string | null
          ends?: Json
          event_name?: string | null
          id?: string
          member_id: string
          old_division?: string | null
          old_target_type?: string | null
          score_date?: string
          target_type?: string | null
          total_score?: number
          tournament_type_id?: string | null
          training_session_id?: string | null
          x_count?: number | null
        }
        Update: {
          club_id?: string
          created_at?: string
          detail?: string | null
          division?: string | null
          division_id?: string | null
          ends?: Json
          event_name?: string | null
          id?: string
          member_id?: string
          old_division?: string | null
          old_target_type?: string | null
          score_date?: string
          target_type?: string | null
          total_score?: number
          tournament_type_id?: string | null
          training_session_id?: string | null
          x_count?: number | null
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
            foreignKeyName: "scores_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
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
            foreignKeyName: "scores_tournament_type_id_fkey"
            columns: ["tournament_type_id"]
            isOneToOne: false
            referencedRelation: "tournament_types"
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
      super_admins: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          annual_discount_percentage: number | null
          created_at: string | null
          id: string
          mercadopago_mode: string | null
          mercadopago_public_key: string | null
          updated_at: string | null
        }
        Insert: {
          annual_discount_percentage?: number | null
          created_at?: string | null
          id?: string
          mercadopago_mode?: string | null
          mercadopago_public_key?: string | null
          updated_at?: string | null
        }
        Update: {
          annual_discount_percentage?: number | null
          created_at?: string | null
          id?: string
          mercadopago_mode?: string | null
          mercadopago_public_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tournament_types: {
        Row: {
          active: boolean
          arrows_per_end: number
          bow_type: string | null
          club_id: string | null
          created_at: string
          description: string | null
          discipline: string | null
          distance_meters: number | null
          distance_yards: number | null
          ends_per_round: number
          id: string
          is_indoor: boolean
          is_system: boolean
          name: string
          scoring_zones: Json | null
          target_size_cm: number | null
          tournament_format: string | null
        }
        Insert: {
          active?: boolean
          arrows_per_end?: number
          bow_type?: string | null
          club_id?: string | null
          created_at?: string
          description?: string | null
          discipline?: string | null
          distance_meters?: number | null
          distance_yards?: number | null
          ends_per_round?: number
          id?: string
          is_indoor?: boolean
          is_system?: boolean
          name: string
          scoring_zones?: Json | null
          target_size_cm?: number | null
          tournament_format?: string | null
        }
        Update: {
          active?: boolean
          arrows_per_end?: number
          bow_type?: string | null
          club_id?: string | null
          created_at?: string
          description?: string | null
          discipline?: string | null
          distance_meters?: number | null
          distance_yards?: number | null
          ends_per_round?: number
          id?: string
          is_indoor?: boolean
          is_system?: boolean
          name?: string
          scoring_zones?: Json | null
          target_size_cm?: number | null
          tournament_format?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_types_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_types_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          attended: boolean | null
          club_id: string
          enrolled_at: string
          id: string
          member_id: string
          training_session_id: string
        }
        Insert: {
          attended?: boolean | null
          club_id: string
          enrolled_at?: string
          id?: string
          member_id: string
          training_session_id: string
        }
        Update: {
          attended?: boolean | null
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
            foreignKeyName: "training_enrollments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
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
          arrow_info: string | null
          arrow_numbers: boolean | null
          attendance_token: string | null
          attendance_token_expires: string | null
          bow_info: string | null
          club_id: string
          created_at: string
          created_by: string | null
          detail: string | null
          discipline: string | null
          distance_yards: number | null
          division: string | null
          event_date: string
          id: string
          location: string | null
          name: string
          rounds_config: Json | null
          target_type: string | null
          training_type: Database["public"]["Enums"]["training_type"] | null
          weather: string | null
          wind_direction: string | null
          wind_speed: string | null
        }
        Insert: {
          arrow_info?: string | null
          arrow_numbers?: boolean | null
          attendance_token?: string | null
          attendance_token_expires?: string | null
          bow_info?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          discipline?: string | null
          distance_yards?: number | null
          division?: string | null
          event_date?: string
          id?: string
          location?: string | null
          name: string
          rounds_config?: Json | null
          target_type?: string | null
          training_type?: Database["public"]["Enums"]["training_type"] | null
          weather?: string | null
          wind_direction?: string | null
          wind_speed?: string | null
        }
        Update: {
          arrow_info?: string | null
          arrow_numbers?: boolean | null
          attendance_token?: string | null
          attendance_token_expires?: string | null
          bow_info?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          discipline?: string | null
          distance_yards?: number | null
          division?: string | null
          event_date?: string
          id?: string
          location?: string | null
          name?: string
          rounds_config?: Json | null
          target_type?: string | null
          training_type?: Database["public"]["Enums"]["training_type"] | null
          weather?: string | null
          wind_direction?: string | null
          wind_speed?: string | null
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
            foreignKeyName: "training_sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs_view"
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
      public_clubs_view: {
        Row: {
          city: string | null
          country: string | null
          id: string | null
          inscription_fee: number | null
          logo_url: string | null
          monthly_fee: number | null
          name: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string | null
          inscription_fee?: number | null
          logo_url?: string | null
          monthly_fee?: number | null
          name?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string | null
          inscription_fee?: number | null
          logo_url?: string | null
          monthly_fee?: number | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation_v2: {
        Args: {
          p_address?: string
          p_date_of_birth?: string
          p_display_name?: string
          p_email?: string
          p_emergency_contact_name?: string
          p_emergency_contact_phone?: string
          p_full_name: string
          p_guardian_email?: string
          p_guardian_name?: string
          p_guardian_phone?: string
          p_identification?: string
          p_medical_history?: string
          p_password?: string
          p_phone?: string
          p_shirt_size?: string
          p_token: string
          p_user_id?: string
          p_windbreaker_size?: string
        }
        Returns: Json
      }
      acknowledge_division_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      admin_reset_user_password: {
        Args: { p_user_id: string; p_club_id: string; p_new_password?: string }
        Returns: string
      }
      auto_update_member_divisions: {
        Args: never
        Returns: {
          member_id: string
          new_division_name: string
          old_division_name: string
        }[]
      }
      calculate_division_by_age: {
        Args: { p_birth_date: string; p_bow_type?: string; p_gender?: string }
        Returns: string
      }
      can_view_club_finances: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: boolean
      }
      create_member_account_by_admin: {
        Args: {
          p_address?: string
          p_club_id: string
          p_date_of_birth?: string
          p_display_name?: string
          p_email?: string
          p_emergency_contact_name?: string
          p_emergency_contact_phone?: string
          p_full_name: string
          p_guardian_email?: string
          p_guardian_name?: string
          p_guardian_phone?: string
          p_identification?: string
          p_medical_history?: string
          p_password?: string
          p_phone?: string
          p_role?: Database["public"]["Enums"]["club_role"]
          p_shirt_size?: string
          p_windbreaker_size?: string
        }
        Returns: Json
      }
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
      has_club_role:
      | {
        Args: {
          p_club_id: string
          p_role: Database["public"]["Enums"]["club_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      | {
        Args: { p_club_id: string; p_role: string; p_user_id: string }
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
      is_member_paid_current_month: {
        Args: { p_member_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
      register_club:
      | {
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
      | {
        Args: {
          p_admin_name: string
          p_city: string
          p_club_name: string
          p_contact_email: string
          p_country: string
          p_monthly_price?: number
          p_plan_id?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      club_role:
      | "administrador"
      | "presidente"
      | "entrenador"
      | "arquero"
      | "socio"
      | "secretaria"
      | "tesorero"
      | "alumno";
      member_status: "activo" | "inactivo";
      subscription_status: "activo" | "pendiente" | "bloqueado";
      training_type: "libre" | "estandar";
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
        "administrador",
        "presidente",
        "entrenador",
        "arquero",
        "socio",
        "secretaria",
        "tesorero",
        "alumno",
      ],
      member_status: ["activo", "inactivo"],
      subscription_status: ["activo", "pendiente", "bloqueado"],
    },
  },
} as const
