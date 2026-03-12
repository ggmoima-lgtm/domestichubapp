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
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "badge_awards_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers_public"
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
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          availability: string[] | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_notes: string | null
          email: string | null
          formatted_address: string | null
          full_name: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          place_id: string | null
          province: string | null
          suburb: string | null
          type_of_need: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string[] | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_notes?: string | null
          email?: string | null
          formatted_address?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          place_id?: string | null
          province?: string | null
          suburb?: string | null
          type_of_need?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string[] | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_notes?: string | null
          email?: string | null
          formatted_address?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          place_id?: string | null
          province?: string | null
          suburb?: string | null
          type_of_need?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      helper_sensitive_data: {
        Row: {
          created_at: string
          helper_id: string
          id: string
          id_document_url: string | null
          references_info: Json | null
          verification_reference_id: string | null
        }
        Insert: {
          created_at?: string
          helper_id: string
          id?: string
          id_document_url?: string | null
          references_info?: Json | null
          verification_reference_id?: string | null
        }
        Update: {
          created_at?: string
          helper_id?: string
          id?: string
          id_document_url?: string | null
          references_info?: Json | null
          verification_reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helper_sensitive_data_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: true
            referencedRelation: "helpers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helper_sensitive_data_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: true
            referencedRelation: "helpers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      helpers: {
        Row: {
          age: number | null
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
          gender: string | null
          has_work_permit: boolean | null
          hourly_rate: number | null
          id: string
          intro_video_url: string | null
          is_verified: boolean | null
          languages: string[] | null
          living_arrangement: string | null
          nationality: string | null
          phone: string
          skills: string[] | null
          updated_at: string
          user_id: string | null
          verification_date: string | null
          verification_status: string
          video_flag_count: number
          video_flagged: boolean
          video_moderation_notes: string | null
          video_moderation_status: string
        }
        Insert: {
          age?: number | null
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
          gender?: string | null
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          living_arrangement?: string | null
          nationality?: string | null
          phone: string
          skills?: string[] | null
          updated_at?: string
          user_id?: string | null
          verification_date?: string | null
          verification_status?: string
          video_flag_count?: number
          video_flagged?: boolean
          video_moderation_notes?: string | null
          video_moderation_status?: string
        }
        Update: {
          age?: number | null
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
          gender?: string | null
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          living_arrangement?: string | null
          nationality?: string | null
          phone?: string
          skills?: string[] | null
          updated_at?: string
          user_id?: string | null
          verification_date?: string | null
          verification_status?: string
          video_flag_count?: number
          video_flagged?: boolean
          video_moderation_notes?: string | null
          video_moderation_status?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          credits_purchased: number
          id: string
          invoice_number: string
          payment_method: string | null
          payment_reference: string | null
          status: string
          tax: number
          total: number
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits_purchased?: number
          id?: string
          invoice_number: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          tax?: number
          total: number
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits_purchased?: number
          id?: string
          invoice_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          tax?: number
          total?: number
          transaction_id?: string | null
          user_id?: string
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
            foreignKeyName: "job_applications_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers_public"
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
          {
            foreignKeyName: "messages_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          admin_actions: boolean
          created_at: string
          credits: boolean
          hire_updates: boolean
          id: string
          interviews: boolean
          messages: boolean
          profile_unlocks: boolean
          reviews: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_actions?: boolean
          created_at?: string
          credits?: boolean
          hire_updates?: boolean
          id?: string
          interviews?: boolean
          messages?: boolean
          profile_unlocks?: boolean
          reviews?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_actions?: boolean
          created_at?: string
          credits?: boolean
          hire_updates?: boolean
          id?: string
          interviews?: boolean
          messages?: boolean
          profile_unlocks?: boolean
          reviews?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          max_attempts: number
          phone: string
          purpose: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          phone: string
          purpose?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          phone?: string
          purpose?: string
          user_id?: string | null
          verified?: boolean
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
          {
            foreignKeyName: "placements_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers_public"
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
          {
            foreignKeyName: "profile_unlocks_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers_public"
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
      promo_codes: {
        Row: {
          bonus_credits: number | null
          code: string
          created_at: string | null
          current_uses: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
        }
        Insert: {
          bonus_credits?: number | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Update: {
          bonus_credits?: number | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          id: string
          promo_code_id: string
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          token?: string
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
            foreignKeyName: "reviews_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers_public"
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
          {
            foreignKeyName: "saved_helpers_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          terms_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          terms_version: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "video_flags_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helpers_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      helpers_public: {
        Row: {
          age: number | null
          availability: string | null
          availability_status: string | null
          available_from: string | null
          avatar_url: string | null
          bio: string | null
          category: string | null
          created_at: string | null
          experience_years: number | null
          full_name: string | null
          gender: string | null
          has_work_permit: boolean | null
          hourly_rate: number | null
          id: string | null
          intro_video_url: string | null
          is_verified: boolean | null
          languages: string[] | null
          living_arrangement: string | null
          nationality: string | null
          skills: string[] | null
          updated_at: string | null
          user_id: string | null
          video_flagged: boolean | null
          video_moderation_status: string | null
        }
        Insert: {
          age?: number | null
          availability?: string | null
          availability_status?: string | null
          available_from?: string | null
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          experience_years?: number | null
          full_name?: string | null
          gender?: string | null
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string | null
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          living_arrangement?: string | null
          nationality?: string | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          video_flagged?: boolean | null
          video_moderation_status?: string | null
        }
        Update: {
          age?: number | null
          availability?: string | null
          availability_status?: string | null
          available_from?: string | null
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          experience_years?: number | null
          full_name?: string | null
          gender?: string | null
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string | null
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          living_arrangement?: string | null
          nationality?: string | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          video_flagged?: boolean | null
          video_moderation_status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits_after_purchase: {
        Args: {
          p_amount: number
          p_credits: number
          p_payment_ref: string
          p_user_id: string
        }
        Returns: boolean
      }
      deduct_credits_for_unlock: {
        Args: { p_credits: number; p_employer_id: string; p_helper_id: string }
        Returns: boolean
      }
      get_helper_ids_for_user: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_hired_helper_ids: {
        Args: { p_employer_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      helper_applied_to_employer: {
        Args: { p_employer_id: string; p_helper_id: string }
        Returns: boolean
      }
      lookup_email_by_phone: { Args: { p_phone: string }; Returns: string }
      redeem_promo_code: { Args: { p_code: string }; Returns: Json }
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
