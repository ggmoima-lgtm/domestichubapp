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
      conversation_members: {
        Row: {
          archived_at: string | null
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string | null
          muted_at: string | null
          profile_id: string
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          archived_at?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          muted_at?: string | null
          profile_id: string
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          archived_at?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          muted_at?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_at: string | null
          created_at: string
          created_from_unlock_id: string | null
          employer_profile_id: string | null
          id: string
          job_id: string | null
          last_message_at: string | null
          related_application_id: string | null
          status: string
          updated_at: string
          worker_profile_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_from_unlock_id?: string | null
          employer_profile_id?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          related_application_id?: string | null
          status?: string
          updated_at?: string
          worker_profile_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_from_unlock_id?: string | null
          employer_profile_id?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          related_application_id?: string | null
          status?: string
          updated_at?: string
          worker_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_from_unlock_id_fkey"
            columns: ["created_from_unlock_id"]
            isOneToOne: false
            referencedRelation: "profile_unlocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_employer_profile_id_fkey"
            columns: ["employer_profile_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "conversations_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          created_at: string
          credits: number
          currency: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          updated_at?: string
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
          avatar_url: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_notes: string | null
          date_of_birth: string | null
          email: string | null
          formatted_address: string | null
          full_name: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          place_id: string | null
          private_exact_address: string | null
          profile_id: string | null
          province: string | null
          public_area: string | null
          suburb: string | null
          type_of_need: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability?: string[] | null
          avatar_url?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_notes?: string | null
          date_of_birth?: string | null
          email?: string | null
          formatted_address?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          place_id?: string | null
          private_exact_address?: string | null
          profile_id?: string | null
          province?: string | null
          public_area?: string | null
          suburb?: string | null
          type_of_need?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability?: string[] | null
          avatar_url?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_notes?: string | null
          date_of_birth?: string | null
          email?: string | null
          formatted_address?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          place_id?: string | null
          private_exact_address?: string | null
          profile_id?: string | null
          province?: string | null
          public_area?: string | null
          suburb?: string | null
          type_of_need?: string | null
          updated_at?: string
          user_id?: string | null
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
          has_tools: boolean | null
          has_work_permit: boolean | null
          hourly_rate: number | null
          id: string
          intro_video_url: string | null
          is_verified: boolean | null
          languages: string[] | null
          living_arrangement: string | null
          location: string | null
          nationality: string | null
          phone: string
          service_type: string
          skills: string[] | null
          skills_domestic: string[] | null
          skills_gardening: string[] | null
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
          has_tools?: boolean | null
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          living_arrangement?: string | null
          location?: string | null
          nationality?: string | null
          phone: string
          service_type?: string
          skills?: string[] | null
          skills_domestic?: string[] | null
          skills_gardening?: string[] | null
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
          has_tools?: boolean | null
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          living_arrangement?: string | null
          location?: string | null
          nationality?: string | null
          phone?: string
          service_type?: string
          skills?: string[] | null
          skills_domestic?: string[] | null
          skills_gardening?: string[] | null
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
      job_alerts: {
        Row: {
          category: string | null
          created_at: string
          employment_type: string | null
          frequency: string
          id: string
          location: string | null
          paused_at: string | null
          push_enabled: boolean
          salary_preference: string | null
          title: string | null
          updated_at: string
          work_arrangement: string | null
          worker_profile_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          employment_type?: string | null
          frequency?: string
          id?: string
          location?: string | null
          paused_at?: string | null
          push_enabled?: boolean
          salary_preference?: string | null
          title?: string | null
          updated_at?: string
          work_arrangement?: string | null
          worker_profile_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          employment_type?: string | null
          frequency?: string
          id?: string
          location?: string | null
          paused_at?: string | null
          push_enabled?: boolean
          salary_preference?: string | null
          title?: string | null
          updated_at?: string
          work_arrangement?: string | null
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "job_alerts_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
          },
        ]
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
      job_category_details: {
        Row: {
          created_at: string
          detail: Json
          job_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          job_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: Json
          job_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_category_details_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
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
      jobs: {
        Row: {
          category_id: string | null
          created_at: string
          duties: string | null
          employer_profile_id: string
          employment_type: string | null
          id: string
          private_exact_address: string | null
          public_area: string | null
          salary_max: number | null
          salary_min: number | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          work_arrangement: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          duties?: string | null
          employer_profile_id: string
          employment_type?: string | null
          id?: string
          private_exact_address?: string | null
          public_area?: string | null
          salary_max?: number | null
          salary_min?: number | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          work_arrangement?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          duties?: string | null
          employer_profile_id?: string
          employment_type?: string | null
          id?: string
          private_exact_address?: string | null
          public_area?: string | null
          salary_max?: number | null
          salary_min?: number | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_arrangement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "worker_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_employer_profile_id_fkey"
            columns: ["employer_profile_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          contact_warning_acknowledged: boolean
          content: string | null
          conversation_id: string | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          failed_at: string | null
          helper_id: string | null
          id: string
          masked_at: string | null
          message_type: string
          moderation_state: Database["public"]["Enums"]["message_moderation_state"]
          moderation_status: string
          original_body_hash: string | null
          read: boolean
          read_at: string | null
          receiver_id: string | null
          reply_to_message_id: string | null
          sender_id: string | null
          sender_profile_id: string | null
        }
        Insert: {
          body?: string | null
          contact_warning_acknowledged?: boolean
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          helper_id?: string | null
          id?: string
          masked_at?: string | null
          message_type?: string
          moderation_state?: Database["public"]["Enums"]["message_moderation_state"]
          moderation_status?: string
          original_body_hash?: string | null
          read?: boolean
          read_at?: string | null
          receiver_id?: string | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_profile_id?: string | null
        }
        Update: {
          body?: string | null
          contact_warning_acknowledged?: boolean
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          helper_id?: string | null
          id?: string
          masked_at?: string | null
          message_type?: string
          moderation_state?: Database["public"]["Enums"]["message_moderation_state"]
          moderation_status?: string
          original_body_hash?: string | null
          read?: boolean
          read_at?: string | null
          receiver_id?: string | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
      onboarding_sessions: {
        Row: {
          completed_at: string | null
          completed_steps: string[]
          created_at: string
          current_step: string | null
          draft: Json | null
          profile_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          current_step?: string | null
          draft?: Json | null
          profile_id: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          current_step?: string | null
          draft?: Json | null
          profile_id?: string
          role?: string
          status?: string
          updated_at?: string
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
      pin_auth_attempts: {
        Row: {
          failed_count: number
          locked_until: string | null
          phone_e164: string
          updated_at: string
        }
        Insert: {
          failed_count?: number
          locked_until?: string | null
          phone_e164: string
          updated_at?: string
        }
        Update: {
          failed_count?: number
          locked_until?: string | null
          phone_e164?: string
          updated_at?: string
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
      profile_pin_credentials: {
        Row: {
          created_at: string
          iterations: number
          pin_hash: string
          profile_id: string
          salt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          iterations?: number
          pin_hash: string
          profile_id: string
          salt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          iterations?: number
          pin_hash?: string
          profile_id?: string
          salt?: string
          updated_at?: string
        }
        Relationships: []
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
          accepted_acceptable_use_version: string | null
          accepted_privacy_version: string | null
          accepted_terms_version: string | null
          age_checked_at: string | null
          area: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          email_verified_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_blocked: boolean
          last_name: string | null
          onboarding_completed: boolean
          phone: string | null
          phone_e164: string | null
          phone_verified_at: string | null
          pin_hash: string | null
          pin_set_at: string | null
          primary_role: string | null
          role: string | null
          role_assigned_at: string | null
          status: string
          surname: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_acceptable_use_version?: string | null
          accepted_privacy_version?: string | null
          accepted_terms_version?: string | null
          age_checked_at?: string | null
          area?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          last_name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          pin_hash?: string | null
          pin_set_at?: string | null
          primary_role?: string | null
          role?: string | null
          role_assigned_at?: string | null
          status?: string
          surname?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_acceptable_use_version?: string | null
          accepted_privacy_version?: string | null
          accepted_terms_version?: string | null
          age_checked_at?: string | null
          area?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          last_name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          pin_hash?: string | null
          pin_set_at?: string | null
          primary_role?: string | null
          role?: string | null
          role_assigned_at?: string | null
          status?: string
          surname?: string | null
          updated_at?: string
          user_id?: string | null
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
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_worker_profiles: {
        Row: {
          employer_profile_id: string
          saved_at: string
          worker_profile_id: string
        }
        Insert: {
          employer_profile_id: string
          saved_at?: string
          worker_profile_id: string
        }
        Update: {
          employer_profile_id?: string
          saved_at?: string
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_worker_profiles_employer_profile_id_fkey"
            columns: ["employer_profile_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "saved_worker_profiles_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "saved_worker_profiles_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          phone_e164: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          phone_e164?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          phone_e164?: string | null
          profile_id?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "worker_categories"
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
      tester_credit_emails: {
        Row: {
          created_at: string
          credits_to_grant: number
          email: string
          id: string
          redeemed: boolean
          redeemed_at: string | null
        }
        Insert: {
          created_at?: string
          credits_to_grant?: number
          email: string
          id?: string
          redeemed?: boolean
          redeemed_at?: string | null
        }
        Update: {
          created_at?: string
          credits_to_grant?: number
          email?: string
          id?: string
          redeemed?: boolean
          redeemed_at?: string | null
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
      worker_availability: {
        Row: {
          areas_willing_to_work: string[]
          available_from: string | null
          available_immediately: boolean
          created_at: string
          days_available: string[]
          employment_types: string[]
          hours_available: string | null
          travel_radius: string | null
          updated_at: string
          worker_profile_id: string
        }
        Insert: {
          areas_willing_to_work?: string[]
          available_from?: string | null
          available_immediately?: boolean
          created_at?: string
          days_available?: string[]
          employment_types?: string[]
          hours_available?: string | null
          travel_radius?: string | null
          updated_at?: string
          worker_profile_id: string
        }
        Update: {
          areas_willing_to_work?: string[]
          available_from?: string | null
          available_immediately?: boolean
          created_at?: string
          days_available?: string[]
          employment_types?: string[]
          hours_available?: string | null
          travel_radius?: string | null
          updated_at?: string
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_availability_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: true
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "worker_availability_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: true
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      worker_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      worker_category_memberships: {
        Row: {
          category_id: string
          created_at: string
          id: string
          worker_profile_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          worker_profile_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_category_memberships_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "worker_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_category_memberships_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "worker_category_memberships_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      worker_documents: {
        Row: {
          created_at: string
          document_type: string | null
          file_path: string | null
          file_url: string | null
          id: string
          updated_at: string
          worker_profile_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          updated_at?: string
          worker_profile_id: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          updated_at?: string
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_documents_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "worker_documents_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      worker_profiles: {
        Row: {
          biography: string | null
          created_at: string
          documentation_declaration: string | null
          documentation_declared_at: string | null
          documentation_terms_version: string | null
          driver_licence: boolean
          expected_rate_max: number | null
          expected_rate_min: number | null
          expected_salary: string | null
          gender: string | null
          intro_video_path: string | null
          intro_video_url: string | null
          introduction_photo_path: string | null
          introduction_photo_url: string | null
          introduction_video_path: string | null
          introduction_video_url: string | null
          languages: string[]
          last_availability_confirmed_at: string | null
          nationality: string | null
          own_tools: boolean
          own_transport: boolean
          private_exact_area: string | null
          profile_completion: number
          profile_id: string
          profile_photo_path: string | null
          profile_photo_url: string | null
          public_area: string | null
          public_holidays: boolean
          published_at: string | null
          salary_type: string | null
          searchable_at: string | null
          skills_text: string | null
          status: string
          travel_radius: string | null
          updated_at: string
          vehicle_available: boolean
          weekends: boolean
          willing_to_travel: boolean
          work_arrangement: string | null
          years_experience: number
        }
        Insert: {
          biography?: string | null
          created_at?: string
          documentation_declaration?: string | null
          documentation_declared_at?: string | null
          documentation_terms_version?: string | null
          driver_licence?: boolean
          expected_rate_max?: number | null
          expected_rate_min?: number | null
          expected_salary?: string | null
          gender?: string | null
          intro_video_path?: string | null
          intro_video_url?: string | null
          introduction_photo_path?: string | null
          introduction_photo_url?: string | null
          introduction_video_path?: string | null
          introduction_video_url?: string | null
          languages?: string[]
          last_availability_confirmed_at?: string | null
          nationality?: string | null
          own_tools?: boolean
          own_transport?: boolean
          private_exact_area?: string | null
          profile_completion?: number
          profile_id: string
          profile_photo_path?: string | null
          profile_photo_url?: string | null
          public_area?: string | null
          public_holidays?: boolean
          published_at?: string | null
          salary_type?: string | null
          searchable_at?: string | null
          skills_text?: string | null
          status?: string
          travel_radius?: string | null
          updated_at?: string
          vehicle_available?: boolean
          weekends?: boolean
          willing_to_travel?: boolean
          work_arrangement?: string | null
          years_experience?: number
        }
        Update: {
          biography?: string | null
          created_at?: string
          documentation_declaration?: string | null
          documentation_declared_at?: string | null
          documentation_terms_version?: string | null
          driver_licence?: boolean
          expected_rate_max?: number | null
          expected_rate_min?: number | null
          expected_salary?: string | null
          gender?: string | null
          intro_video_path?: string | null
          intro_video_url?: string | null
          introduction_photo_path?: string | null
          introduction_photo_url?: string | null
          introduction_video_path?: string | null
          introduction_video_url?: string | null
          languages?: string[]
          last_availability_confirmed_at?: string | null
          nationality?: string | null
          own_tools?: boolean
          own_transport?: boolean
          private_exact_area?: string | null
          profile_completion?: number
          profile_id?: string
          profile_photo_path?: string | null
          profile_photo_url?: string | null
          public_area?: string | null
          public_holidays?: boolean
          published_at?: string | null
          salary_type?: string | null
          searchable_at?: string | null
          skills_text?: string | null
          status?: string
          travel_radius?: string | null
          updated_at?: string
          vehicle_available?: boolean
          weekends?: boolean
          willing_to_travel?: boolean
          work_arrangement?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      worker_qualifications: {
        Row: {
          certificate_document_id: string | null
          created_at: string
          id: string
          institution: string | null
          qualification: string | null
          updated_at: string
          worker_profile_id: string
          year: number | null
        }
        Insert: {
          certificate_document_id?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          qualification?: string | null
          updated_at?: string
          worker_profile_id: string
          year?: number | null
        }
        Update: {
          certificate_document_id?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          qualification?: string | null
          updated_at?: string
          worker_profile_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_qualifications_certificate_document_id_fkey"
            columns: ["certificate_document_id"]
            isOneToOne: false
            referencedRelation: "worker_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qualifications_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "worker_qualifications_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      worker_references: {
        Row: {
          created_at: string
          email: string | null
          employer_name: string | null
          id: string
          phone: string | null
          reference_name: string | null
          relationship: string | null
          updated_at: string
          worker_profile_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          employer_name?: string | null
          id?: string
          phone?: string | null
          reference_name?: string | null
          relationship?: string | null
          updated_at?: string
          worker_profile_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          employer_name?: string | null
          id?: string
          phone?: string | null
          reference_name?: string | null
          relationship?: string | null
          updated_at?: string
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_references_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "worker_references_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      worker_work_experiences: {
        Row: {
          created_at: string
          employer_name: string | null
          end_date: string | null
          id: string
          is_current: boolean
          responsibilities: string | null
          role_title: string | null
          start_date: string | null
          updated_at: string
          worker_profile_id: string
        }
        Insert: {
          created_at?: string
          employer_name?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          responsibilities?: string | null
          role_title?: string | null
          start_date?: string | null
          updated_at?: string
          worker_profile_id: string
        }
        Update: {
          created_at?: string
          employer_name?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          responsibilities?: string | null
          role_title?: string | null
          start_date?: string | null
          updated_at?: string
          worker_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_work_experiences_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "worker_work_experiences_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles_public"
            referencedColumns: ["profile_id"]
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
          has_tools: boolean | null
          has_work_permit: boolean | null
          hourly_rate: number | null
          id: string | null
          intro_video_url: string | null
          is_verified: boolean | null
          languages: string[] | null
          living_arrangement: string | null
          location: string | null
          nationality: string | null
          service_type: string | null
          skills: string[] | null
          skills_domestic: string[] | null
          skills_gardening: string[] | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
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
          has_tools?: boolean | null
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string | null
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          living_arrangement?: string | null
          location?: string | null
          nationality?: string | null
          service_type?: string | null
          skills?: string[] | null
          skills_domestic?: string[] | null
          skills_gardening?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
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
          has_tools?: boolean | null
          has_work_permit?: boolean | null
          hourly_rate?: number | null
          id?: string | null
          intro_video_url?: string | null
          is_verified?: boolean | null
          languages?: string[] | null
          living_arrangement?: string | null
          location?: string | null
          nationality?: string | null
          service_type?: string | null
          skills?: string[] | null
          skills_domestic?: string[] | null
          skills_gardening?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          video_flagged?: boolean | null
          video_moderation_status?: string | null
        }
        Relationships: []
      }
      worker_profiles_public: {
        Row: {
          biography: string | null
          created_at: string | null
          expected_rate_max: number | null
          expected_rate_min: number | null
          expected_salary: string | null
          intro_video_url: string | null
          introduction_photo_url: string | null
          introduction_video_url: string | null
          languages: string[] | null
          last_availability_confirmed_at: string | null
          profile_completion: number | null
          profile_id: string | null
          profile_photo_url: string | null
          public_area: string | null
          salary_type: string | null
          searchable_at: string | null
          skills_text: string | null
          status: string | null
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          biography?: string | null
          created_at?: string | null
          expected_rate_max?: number | null
          expected_rate_min?: number | null
          expected_salary?: string | null
          intro_video_url?: string | null
          introduction_photo_url?: string | null
          introduction_video_url?: string | null
          languages?: string[] | null
          last_availability_confirmed_at?: string | null
          profile_completion?: number | null
          profile_id?: string | null
          profile_photo_url?: string | null
          public_area?: string | null
          salary_type?: string | null
          searchable_at?: string | null
          skills_text?: string | null
          status?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          biography?: string | null
          created_at?: string | null
          expected_rate_max?: number | null
          expected_rate_min?: number | null
          expected_salary?: string | null
          intro_video_url?: string | null
          introduction_photo_url?: string | null
          introduction_video_url?: string | null
          languages?: string[] | null
          last_availability_confirmed_at?: string | null
          profile_completion?: number | null
          profile_id?: string | null
          profile_photo_url?: string | null
          public_area?: string | null
          salary_type?: string | null
          searchable_at?: string | null
          skills_text?: string | null
          status?: string | null
          updated_at?: string | null
          years_experience?: number | null
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
      apply_credit_ledger_entry: {
        Args: {
          actor?: string
          credit_delta: number
          employer: string
          entry_type: string
          reason?: string
          reference_id?: string
          store_transaction?: string
        }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "credit_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_conversation_accept_messages: {
        Args: { conversation: string; sender: string }
        Returns: boolean
      }
      contains_contact_detail: { Args: { body: string }; Returns: boolean }
      create_direct_conversation: {
        Args: { job?: string; other_profile: string }
        Returns: {
          archived_at: string | null
          created_at: string
          created_from_unlock_id: string | null
          employer_profile_id: string | null
          id: string
          job_id: string | null
          last_message_at: string | null
          related_application_id: string | null
          status: string
          updated_at: string
          worker_profile_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deduct_credits_for_unlock: {
        Args: { p_credits: number; p_employer_id: string; p_helper_id: string }
        Returns: boolean
      }
      ensure_employer_wallet: {
        Args: { employer: string }
        Returns: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "credit_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_authorized_conversations: {
        Args: never
        Returns: {
          archived: boolean
          context: string
          id: string
          last_message_at: string
          last_message_preview: string
          muted: boolean
          other_name: string
          other_profile_id: string
          other_role: string
          status: string
          unread_count: number
        }[]
      }
      get_employer_names: {
        Args: { p_employer_ids: string[] }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      get_employer_unlocked_document_access: {
        Args: { document: string }
        Returns: {
          bucket_id: string
          document_id: string
          storage_path: string
        }[]
      }
      get_employer_wallet_state: { Args: never; Returns: Json }
      get_helper_ids_for_user: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_hired_helper_ids: {
        Args: { p_employer_id: string }
        Returns: string[]
      }
      get_worker_unlock_state: { Args: { worker: string }; Returns: Json }
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
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_conversation_member: {
        Args: { conversation: string }
        Returns: boolean
      }
      is_profile_active: { Args: { profile: string }; Returns: boolean }
      is_worker_searchable: { Args: { worker: string }; Returns: boolean }
      list_unlocked_worker_profiles: {
        Args: never
        Returns: {
          availability_status: string
          avatar_url: string
          expected_rate_max: number
          expected_rate_min: number
          expires_at: string
          first_name: string
          phone_verified: boolean
          primary_category: string
          primary_category_slug: string
          public_area: string
          skills: string
          surname_initial: string
          unlocked_at: string
          worker_profile_id: string
          years_experience: number
        }[]
      }
      lookup_email_by_phone: { Args: { p_phone: string }; Returns: string }
      mark_conversation_read: {
        Args: { conversation: string }
        Returns: undefined
      }
      mask_contact_details: { Args: { body: string }; Returns: string }
      publish_job: {
        Args: { p_job_id: string }
        Returns: {
          category_id: string | null
          created_at: string
          duties: string | null
          employer_profile_id: string
          employment_type: string | null
          id: string
          private_exact_address: string | null
          public_area: string | null
          salary_max: number | null
          salary_min: number | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          work_arrangement: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_verified_store_purchase: {
        Args: {
          package_id: string
          platform_name: string
          provider_transaction: string
          receipt_hash: string
        }
        Returns: Json
      }
      redeem_promo_code: { Args: { p_code: string }; Returns: Json }
      search_worker_previews: {
        Args: {
          category_slug?: string
          limit_count?: number
          location_text?: string
          search_text?: string
        }
        Returns: {
          availability_status: string
          avatar_url: string
          biography: string
          expected_rate_max: number
          expected_rate_min: number
          first_name: string
          last_active_at: string
          phone_verified: boolean
          primary_category: string
          primary_category_slug: string
          public_area: string
          saved: boolean
          skills: string
          surname_initial: string
          unlocked: boolean
          worker_profile_id: string
          years_experience: number
        }[]
      }
      send_conversation_message: {
        Args: {
          acknowledged_contact_warning?: boolean
          body: string
          conversation: string
        }
        Returns: {
          body: string | null
          contact_warning_acknowledged: boolean
          content: string | null
          conversation_id: string | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          failed_at: string | null
          helper_id: string | null
          id: string
          masked_at: string | null
          message_type: string
          moderation_state: Database["public"]["Enums"]["message_moderation_state"]
          moderation_status: string
          original_body_hash: string | null
          read: boolean
          read_at: string | null
          receiver_id: string | null
          reply_to_message_id: string | null
          sender_id: string | null
          sender_profile_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_unlocked_conversation: {
        Args: {
          related_application?: string
          related_job?: string
          worker: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          created_from_unlock_id: string | null
          employer_profile_id: string | null
          id: string
          job_id: string | null
          last_message_at: string | null
          related_application_id: string | null
          status: string
          updated_at: string
          worker_profile_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unlock_worker_profile: { Args: { worker: string }; Returns: Json }
      update_helper_availability: {
        Args: { p_helper_id: string; p_status: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      message_moderation_state: "clean" | "masked" | "flagged" | "removed"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      message_moderation_state: ["clean", "masked", "flagged", "removed"],
    },
  },
} as const
