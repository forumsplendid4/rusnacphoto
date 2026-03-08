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
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          access_key: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          slug: string
          title: string
          watermark_text: string
        }
        Insert: {
          access_key?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          slug: string
          title: string
          watermark_text?: string
        }
        Update: {
          access_key?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          watermark_text?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          photo_id: string
          print_size_id: string
          quantity: number
        }
        Insert: {
          id?: string
          order_id: string
          photo_id: string
          print_size_id: string
          quantity?: number
        }
        Update: {
          id?: string
          order_id?: string
          photo_id?: string
          print_size_id?: string
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
            foreignKeyName: "order_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_print_size_id_fkey"
            columns: ["print_size_id"]
            isOneToOne: false
            referencedRelation: "print_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          event_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          event_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          event_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          event_id: string
          filename: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          event_id: string
          filename: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          event_id?: string
          filename?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      print_sizes: {
        Row: {
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_photo:
        | {
            Args: {
              p_admin_token: string
              p_event_id: string
              p_filename: string
              p_storage_path: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_event_id: string
              p_filename: string
              p_storage_path: string
            }
            Returns: undefined
          }
      admin_create_event: {
        Args: {
          p_access_key?: string
          p_admin_token: string
          p_description?: string
          p_slug: string
          p_title: string
          p_watermark_text?: string
        }
        Returns: undefined
      }
      admin_create_print_size: {
        Args: { p_admin_token: string; p_name: string; p_price?: number }
        Returns: undefined
      }
      admin_delete_event:
        | {
            Args: { p_admin_token: string; p_event_id: string }
            Returns: undefined
          }
        | { Args: { p_event_id: string }; Returns: undefined }
      admin_delete_photo:
        | {
            Args: { p_admin_token: string; p_photo_id: string }
            Returns: undefined
          }
        | { Args: { p_photo_id: string }; Returns: undefined }
      admin_delete_print_size: {
        Args: { p_admin_token: string; p_id: string }
        Returns: undefined
      }
      admin_get_events: {
        Args: { p_admin_token?: string }
        Returns: {
          access_key: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          order_count: number
          photo_count: number
          slug: string
          title: string
          watermark_text: string
        }[]
      }
      admin_get_orders:
        | {
            Args: { p_admin_token: string; p_event_id: string }
            Returns: {
              created_at: string
              customer_name: string
              customer_phone: string
              filename: string
              print_size_name: string
              quantity: number
            }[]
          }
        | {
            Args: { p_event_id: string }
            Returns: {
              created_at: string
              customer_name: string
              customer_phone: string
              filename: string
              print_size_name: string
              quantity: number
            }[]
          }
      admin_get_print_sizes: {
        Args: { p_admin_token: string }
        Returns: {
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
        }[]
      }
      admin_toggle_event:
        | {
            Args: {
              p_active: boolean
              p_admin_token: string
              p_event_id: string
            }
            Returns: undefined
          }
        | {
            Args: { p_active: boolean; p_event_id: string }
            Returns: undefined
          }
      admin_update_print_size: {
        Args: {
          p_admin_token: string
          p_id: string
          p_is_active: boolean
          p_name: string
          p_price: number
        }
        Returns: undefined
      }
      create_order_with_items: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_event_id: string
          p_items: Json
        }
        Returns: string
      }
      find_event_by_key: {
        Args: { p_key: string }
        Returns: {
          description: string
          id: string
          slug: string
          title: string
        }[]
      }
      verify_admin_password: {
        Args: { input_password: string }
        Returns: boolean
      }
      verify_admin_token: { Args: { p_token: string }; Returns: boolean }
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
