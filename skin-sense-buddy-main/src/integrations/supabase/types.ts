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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key: string
          clinic_name: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          rate_limit: number | null
          requests_used: number | null
          user_id: string
        }
        Insert: {
          api_key: string
          clinic_name: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          rate_limit?: number | null
          requests_used?: number | null
          user_id: string
        }
        Update: {
          api_key?: string
          clinic_name?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          rate_limit?: number | null
          requests_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          clinician_id: string
          created_at: string
          duration_minutes: number | null
          follow_up_date: string | null
          id: string
          meeting_url: string | null
          notes: string | null
          patient_user_id: string
          prescription: string | null
          scan_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string
        }
        Insert: {
          clinician_id: string
          created_at?: string
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          meeting_url?: string | null
          notes?: string | null
          patient_user_id: string
          prescription?: string | null
          scan_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
        }
        Update: {
          clinician_id?: string
          created_at?: string
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          meeting_url?: string | null
          notes?: string | null
          patient_user_id?: string
          prescription?: string | null
          scan_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "clinicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicians: {
        Row: {
          availability: Json | null
          bio: string | null
          consultation_fee_ngn: number
          created_at: string
          id: string
          is_verified: boolean | null
          license_number: string
          rating: number | null
          specialty: string
          total_consultations: number | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          consultation_fee_ngn: number
          created_at?: string
          id?: string
          is_verified?: boolean | null
          license_number: string
          rating?: number | null
          specialty: string
          total_consultations?: number | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          consultation_fee_ngn?: number
          created_at?: string
          id?: string
          is_verified?: boolean | null
          license_number?: string
          rating?: number | null
          specialty?: string
          total_consultations?: number | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      custom_formulations: {
        Row: {
          contraindications: string | null
          created_at: string
          diagnosis_id: string | null
          estimated_cost_ngn: number | null
          expected_benefits: Json | null
          formulation_name: string
          id: string
          ingredients: Json
          instructions: string
          user_id: string
        }
        Insert: {
          contraindications?: string | null
          created_at?: string
          diagnosis_id?: string | null
          estimated_cost_ngn?: number | null
          expected_benefits?: Json | null
          formulation_name: string
          id?: string
          ingredients: Json
          instructions: string
          user_id: string
        }
        Update: {
          contraindications?: string | null
          created_at?: string
          diagnosis_id?: string | null
          estimated_cost_ngn?: number | null
          expected_benefits?: Json | null
          formulation_name?: string
          id?: string
          ingredients?: Json
          instructions?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_formulations_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          ai_model_version: string | null
          analysis_type: string | null
          conditions: Json
          confidence_score: number
          created_at: string
          hair_profile: Json | null
          heatmap_url: string | null
          id: string
          primary_condition: string
          processing_time_ms: number | null
          scan_id: string
          severity: string | null
          skin_profile: Json | null
          triage_level: string
          user_id: string
        }
        Insert: {
          ai_model_version?: string | null
          analysis_type?: string | null
          conditions: Json
          confidence_score: number
          created_at?: string
          hair_profile?: Json | null
          heatmap_url?: string | null
          id?: string
          primary_condition: string
          processing_time_ms?: number | null
          scan_id: string
          severity?: string | null
          skin_profile?: Json | null
          triage_level: string
          user_id: string
        }
        Update: {
          ai_model_version?: string | null
          analysis_type?: string | null
          conditions?: Json
          confidence_score?: number
          created_at?: string
          hair_profile?: Json | null
          heatmap_url?: string | null
          id?: string
          primary_condition?: string
          processing_time_ms?: number | null
          scan_id?: string
          severity?: string | null
          skin_profile?: Json | null
          triage_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      family_accounts: {
        Row: {
          child_user_id: string
          created_at: string
          id: string
          parent_user_id: string
          relationship: string
        }
        Insert: {
          child_user_id: string
          created_at?: string
          id?: string
          parent_user_id: string
          relationship: string
        }
        Update: {
          child_user_id?: string
          created_at?: string
          id?: string
          parent_user_id?: string
          relationship?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_ngn: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_ngn: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_ngn?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          order_number: string
          payment_status: string
          shipping_address: Json
          status: string
          total_amount_ngn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_number: string
          payment_status?: string
          shipping_address: Json
          status?: string
          total_amount_ngn: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_number?: string
          payment_status?: string
          shipping_address?: Json
          status?: string
          total_amount_ngn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          contraindications: string[] | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          is_active: boolean | null
          low_stock_threshold: number
          name: string
          price_ngn: number | null
          product_type: string | null
          sku: string
          sold_count: number
          stock_quantity: number
          suitable_for_conditions: string[] | null
          suitable_hair_concerns: string[] | null
          suitable_hair_types: string[] | null
          suitable_skin_types: string[] | null
          updated_at: string
        }
        Insert: {
          category: string
          contraindications?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_active?: boolean | null
          low_stock_threshold?: number
          name: string
          price_ngn?: number | null
          product_type?: string | null
          sku: string
          sold_count?: number
          stock_quantity?: number
          suitable_for_conditions?: string[] | null
          suitable_hair_concerns?: string[] | null
          suitable_hair_types?: string[] | null
          suitable_skin_types?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          contraindications?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_active?: boolean | null
          low_stock_threshold?: number
          name?: string
          price_ngn?: number | null
          product_type?: string | null
          sku?: string
          sold_count?: number
          stock_quantity?: number
          suitable_for_conditions?: string[] | null
          suitable_hair_concerns?: string[] | null
          suitable_hair_types?: string[] | null
          suitable_skin_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          allergies: string[] | null
          chemical_treatments: string[] | null
          country: string | null
          created_at: string
          current_medications: string[] | null
          fitzpatrick_scale: string | null
          full_name: string | null
          hair_concerns: string[] | null
          hair_density: string | null
          hair_length: string | null
          hair_porosity: string | null
          hair_type: string | null
          id: string
          is_chemically_treated: boolean | null
          is_pregnant: boolean | null
          last_chemical_treatment: string | null
          medical_conditions: string[] | null
          phone: string | null
          scalp_condition: string | null
          sex: string | null
          skin_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          allergies?: string[] | null
          chemical_treatments?: string[] | null
          country?: string | null
          created_at?: string
          current_medications?: string[] | null
          fitzpatrick_scale?: string | null
          full_name?: string | null
          hair_concerns?: string[] | null
          hair_density?: string | null
          hair_length?: string | null
          hair_porosity?: string | null
          hair_type?: string | null
          id?: string
          is_chemically_treated?: boolean | null
          is_pregnant?: boolean | null
          last_chemical_treatment?: string | null
          medical_conditions?: string[] | null
          phone?: string | null
          scalp_condition?: string | null
          sex?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          allergies?: string[] | null
          chemical_treatments?: string[] | null
          country?: string | null
          created_at?: string
          current_medications?: string[] | null
          fitzpatrick_scale?: string | null
          full_name?: string | null
          hair_concerns?: string[] | null
          hair_density?: string | null
          hair_length?: string | null
          hair_porosity?: string | null
          hair_type?: string | null
          id?: string
          is_chemically_treated?: boolean | null
          is_pregnant?: boolean | null
          last_chemical_treatment?: string | null
          medical_conditions?: string[] | null
          phone?: string | null
          scalp_condition?: string | null
          sex?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          body_area: string | null
          capture_info: Json | null
          created_at: string
          id: string
          image_metadata: Json | null
          image_url: string
          notes: string | null
          scan_type: string | null
          status: string
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          body_area?: string | null
          capture_info?: Json | null
          created_at?: string
          id?: string
          image_metadata?: Json | null
          image_url: string
          notes?: string | null
          scan_type?: string | null
          status?: string
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          body_area?: string | null
          capture_info?: Json | null
          created_at?: string
          id?: string
          image_metadata?: Json | null
          image_url?: string
          notes?: string | null
          scan_type?: string | null
          status?: string
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          includes_custom_formulations: boolean | null
          includes_telehealth: boolean | null
          is_active: boolean | null
          max_family_members: number | null
          max_scans_per_month: number | null
          name: string
          price_ngn: number
          stripe_price_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          includes_custom_formulations?: boolean | null
          includes_telehealth?: boolean | null
          is_active?: boolean | null
          max_family_members?: number | null
          max_scans_per_month?: number | null
          name: string
          price_ngn: number
          stripe_price_id?: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          includes_custom_formulations?: boolean | null
          includes_telehealth?: boolean | null
          is_active?: boolean | null
          max_family_members?: number | null
          max_scans_per_month?: number | null
          name?: string
          price_ngn?: number
          stripe_price_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          scans_used_this_period: number | null
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          scans_used_this_period?: number | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          scans_used_this_period?: number | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          created_at: string
          diagnosis_id: string
          follow_up_days: number | null
          id: string
          ingredients_to_avoid: string[] | null
          ingredients_to_use: string[] | null
          lifestyle_tips: string[] | null
          product_recommendations: Json | null
          recommendations: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diagnosis_id: string
          follow_up_days?: number | null
          id?: string
          ingredients_to_avoid?: string[] | null
          ingredients_to_use?: string[] | null
          lifestyle_tips?: string[] | null
          product_recommendations?: Json | null
          recommendations: string
          user_id: string
        }
        Update: {
          created_at?: string
          diagnosis_id?: string
          follow_up_days?: number | null
          id?: string
          ingredients_to_avoid?: string[] | null
          ingredients_to_use?: string[] | null
          lifestyle_tips?: string[] | null
          product_recommendations?: Json | null
          recommendations?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "clinician" | "admin"
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rescheduled"
      subscription_tier:
        | "free"
        | "basic"
        | "premium"
        | "family"
        | "professional"
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
      app_role: ["user", "clinician", "admin"],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      subscription_tier: ["free", "basic", "premium", "family", "professional"],
    },
  },
} as const
