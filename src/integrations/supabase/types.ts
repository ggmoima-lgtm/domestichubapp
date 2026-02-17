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
      badge_awards: {
        Row: {
          awarded_at: string
          badge_id: string
          helper_id: string
          id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          helper_id: string
          id?: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          helper_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          availability: string[] | null
          category: string | null
          created_at: string
          custom_notes: string | null
          email: string | null
          full_name: string | null
          id: string
          location: string | null
          type_of_need: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string[] | null
          category?: string | null
          created_at?: string
          custom_notes?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          type_of_need?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string[] | null
          category?: string | null
          created_at?: string
          custom_notes?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          type_of_need?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      helpers: {
        Row: {
          availability: string | null
          availability_status: string
          available_from: string | null
          avatar_url: string | null
          bio: string | null
          category: string
          created_at: string
          email: string
          experience_years: number | null
          full_name: string
          has_work_permit: boolean | null
          hourly_rate: number | null
          id: string
          intro_video_url: string | null
          is_verified: boolean | null
          languages: string[] | null
          phone: string
          skills: string[] | null
          updated_at: string
          user_id: string | null
          video_flag_count: number
          video_flagged: boolean
          video_moderation_notes: string | null
          video_moderation_status: string
        }
        Insert: {
          availability?: string | null
          availability_status?: string
          available_from?: string | null
          avatar_url?: string | null
          bio?: string | null
          category: string
          created_at?: string
          email: string
          experience_years?: number | null
          full_name: string
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          phone: string
          skills?: string[] | null
          updated_at?: string
          user_id?: string | null
          video_flag_count?: number
          video_flagged?: boolean
          video_moderation_notes?: string | null
          video_moderation_status?: string
        }
        Update: {
          availability?: string | null
          availability_status?: string
          available_from?: string | null
          avatar_url?: string | null
          bio?: string | null
          category?: string
          created_at?: string
          email?: string
          experience_years?: number | null
          full_name?: string
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          phone?: string
          skills?: string[] | null
          updated_at?: string
          user_id?: string | null
          video_flag_count?: number
          video_flagged?: boolean
          video_moderation_notes?: string | null
          video_moderation_status?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          created_at: string
          helper_id: string
          id: string
          job_id: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          helper_id: string
          id?: string
          job_id: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          helper_id?: string
          id?: string
          job_id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duties: string[] | null
          employer_id: string
          family_size: string | null
          hours_per_week: number | null
          house_size: string | null
          id: string
          job_type: string | null
          live_in_out: string | null
          location: string | null
          negotiable: boolean | null
          salary_max: number | null
          salary_min: number | null
          skills_required: string[] | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duties?: string[] | null
          employer_id: string
          family_size?: string | null
          hours_per_week?: number | null
          house_size?: string | null
          id?: string
          job_type?: string | null
          live_in_out?: string | null
          location?: string | null
          negotiable?: boolean | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duties?: string[] | null
          employer_id?: string
          family_size?: string | null
          hours_per_week?: number | null
          house_size?: string | null
          id?: string
          job_type?: string | null
          live_in_out?: string | null
          location?: string | null
          negotiable?: boolean | null
          salary_max?: number | null
          salary_min?: number | null
          skills_required?: string[] | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          helper_id: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          helper_id: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          helper_id?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          created_at: string
          early_termination: boolean
          employer_id: string
          employer_name: string | null
          ended_at: string | null
          helper_id: string
          hired_at: string
          id: string
          job_category: string | null
          job_type: string | null
          status: string
          terminated_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          early_termination?: boolean
          employer_id: string
          employer_name?: string | null
          ended_at?: string | null
          helper_id: string
          hired_at?: string
          id?: string
          job_category?: string | null
          job_type?: string | null
          status?: string
          terminated_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          early_termination?: boolean
          employer_id?: string
          employer_name?: string | null
          ended_at?: string | null
          helper_id?: string
          hired_at?: string
          id?: string
          job_category?: string | null
          job_type?: string | null
          status?: string
          terminated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_unlocks: {
        Row: {
          amount_paid: number
          bundle_type: string
          created_at: string
          employer_id: string
          expires_at: string
          helper_id: string
          id: string
          unlocked_at: string
        }
        Insert: {
          amount_paid?: number
          bundle_type?: string
          created_at?: string
          employer_id: string
          expires_at?: string
          helper_id: string
          id?: string
          unlocked_at?: string
        }
        Update: {
          amount_paid?: number
          bundle_type?: string
          created_at?: string
          employer_id?: string
          expires_at?: string
          helper_id?: string
          id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_unlocks_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          onboarding_completed: boolean
          phone: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          onboarding_completed?: boolean
          phone: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          onboarding_completed?: boolean
          phone?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          employer_id: string
          helper_id: string
          id: string
          placement_id: string | null
          rating: number
          would_hire_again: boolean | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          employer_id: string
          helper_id: string
          id?: string
          placement_id?: string | null
          rating: number
          would_hire_again?: boolean | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          employer_id?: string
          helper_id?: string
          id?: string
          placement_id?: string | null
          rating?: number
          would_hire_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: true
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_helpers: {
        Row: {
          created_at: string
          employer_id: string
          helper_id: string
          id: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          helper_id: string
          id?: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          helper_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_helpers_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_flags: {
        Row: {
          created_at: string
          flagged_by: string
          helper_id: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          flagged_by: string
          helper_id: string
          id?: string
          reason?: string
        }
        Update: {
          created_at?: string
          flagged_by?: string
          helper_id?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_flags_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
