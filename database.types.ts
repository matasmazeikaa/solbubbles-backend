export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      game_state: {
        Row: {
          createdAt: string
          id: string
          players: Json | null
        }
        Insert: {
          createdAt?: string
          id: string
          players?: Json | null
        }
        Update: {
          createdAt?: string
          id?: string
          players?: Json | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          createdAt: string | null
          id: number
          transactionSignature: string
        }
        Insert: {
          createdAt?: string | null
          id?: number
          transactionSignature: string
        }
        Update: {
          createdAt?: string | null
          id?: number
          transactionSignature?: string
        }
        Relationships: []
      }
      user_statistics: {
        Row: {
          id: string
          killCount: number
          publicKey: string
          totalTokenWinnings: number | null
        }
        Insert: {
          id?: string
          killCount?: number
          publicKey: string
          totalTokenWinnings?: number | null
        }
        Update: {
          id?: string
          killCount?: number
          publicKey?: string
          totalTokenWinnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_user_statistics_publicKey_fkey"
            columns: ["publicKey"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          },
        ]
      }
      users: {
        Row: {
          auth: Json | null
          createdAt: string
          depositedSplLamports: string | null
          id: string
          publicKey: string
        }
        Insert: {
          auth?: Json | null
          createdAt?: string
          depositedSplLamports?: string | null
          id?: string
          publicKey: string
        }
        Update: {
          auth?: Json | null
          createdAt?: string
          depositedSplLamports?: string | null
          id?: string
          publicKey?: string
        }
        Relationships: []
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
