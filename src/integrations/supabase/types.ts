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
      employer_profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          location: string | null
          type_of_need: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          type_of_need?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
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
        }
        Relationships: []
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
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          onboarding_completed: boolean
          phone: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          onboarding_completed?: boolean
          phone: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
