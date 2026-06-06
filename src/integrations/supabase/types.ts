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
      activity_log: {
        Row: {
          acao: string
          created_at: string
          dados: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      condominios_cache: {
        Row: {
          cidade: string | null
          cidade_codigo: number | null
          codigo: number
          created_at: string | null
          finalidade: number | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          cidade?: string | null
          cidade_codigo?: number | null
          codigo: number
          created_at?: string | null
          finalidade?: number | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          cidade?: string | null
          cidade_codigo?: number | null
          codigo?: number
          created_at?: string | null
          finalidade?: number | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      distribuicao_regras: {
        Row: {
          ativo: boolean
          config: Json
          created_at: string
          id: string
          nome: string
          prioridade: number
          tipo: Database["public"]["Enums"]["distribuicao_tipo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          config?: Json
          created_at?: string
          id?: string
          nome: string
          prioridade?: number
          tipo: Database["public"]["Enums"]["distribuicao_tipo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          config?: Json
          created_at?: string
          id?: string
          nome?: string
          prioridade?: number
          tipo?: Database["public"]["Enums"]["distribuicao_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      imoveis_proprios: {
        Row: {
          area: number | null
          area_total: number | null
          ativo: boolean
          bairro: string | null
          banheiros: number | null
          caracteristicas: string[] | null
          cep: string | null
          cidade: string | null
          codigo_interno: string | null
          condominio: number | null
          corretor_id: string | null
          created_at: string
          descricao: string | null
          destaque: boolean
          documentos: Json | null
          endereco: string | null
          estado: string | null
          finalidade: string
          fotos: string[] | null
          id: string
          iptu: number | null
          latitude: number | null
          longitude: number | null
          preco: number
          quartos: number | null
          status: Database["public"]["Enums"]["imovel_status"]
          suites: number | null
          tipo: string
          titulo: string
          tour_360_url: string | null
          updated_at: string
          vagas: number | null
          video_url: string | null
        }
        Insert: {
          area?: number | null
          area_total?: number | null
          ativo?: boolean
          bairro?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          cep?: string | null
          cidade?: string | null
          codigo_interno?: string | null
          condominio?: number | null
          corretor_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          documentos?: Json | null
          endereco?: string | null
          estado?: string | null
          finalidade?: string
          fotos?: string[] | null
          id?: string
          iptu?: number | null
          latitude?: number | null
          longitude?: number | null
          preco: number
          quartos?: number | null
          status?: Database["public"]["Enums"]["imovel_status"]
          suites?: number | null
          tipo: string
          titulo: string
          tour_360_url?: string | null
          updated_at?: string
          vagas?: number | null
          video_url?: string | null
        }
        Update: {
          area?: number | null
          area_total?: number | null
          ativo?: boolean
          bairro?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          cep?: string | null
          cidade?: string | null
          codigo_interno?: string | null
          condominio?: number | null
          corretor_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          documentos?: Json | null
          endereco?: string | null
          estado?: string | null
          finalidade?: string
          fotos?: string[] | null
          id?: string
          iptu?: number | null
          latitude?: number | null
          longitude?: number | null
          preco?: number
          quartos?: number | null
          status?: Database["public"]["Enums"]["imovel_status"]
          suites?: number | null
          tipo?: string
          titulo?: string
          tour_360_url?: string | null
          updated_at?: string
          vagas?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_proprios_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_distribuicoes: {
        Row: {
          corretor_id: string | null
          created_at: string
          distribuido_por: string | null
          id: string
          lead_id: string
          tipo_distribuicao: Database["public"]["Enums"]["distribuicao_tipo"]
        }
        Insert: {
          corretor_id?: string | null
          created_at?: string
          distribuido_por?: string | null
          id?: string
          lead_id: string
          tipo_distribuicao: Database["public"]["Enums"]["distribuicao_tipo"]
        }
        Update: {
          corretor_id?: string | null
          created_at?: string
          distribuido_por?: string | null
          id?: string
          lead_id?: string
          tipo_distribuicao?: Database["public"]["Enums"]["distribuicao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_distribuicoes_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distribuicoes_distribuido_por_fkey"
            columns: ["distribuido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distribuicoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documentos: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          mime: string | null
          nome: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          mime?: string | null
          nome: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          mime?: string | null
          nome?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_documentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_documentos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interacoes: {
        Row: {
          autor_id: string | null
          created_at: string
          descricao: string
          id: string
          lead_id: string
          tipo: Database["public"]["Enums"]["interacao_tipo"]
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          lead_id: string
          tipo: Database["public"]["Enums"]["interacao_tipo"]
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: Database["public"]["Enums"]["interacao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_interacoes_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          bairro_interesse: string | null
          cidade_interesse: string | null
          corretor_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          finalidade: string | null
          id: string
          imovel_interesse_codigo: string | null
          last_contact_at: string | null
          nome: string
          observacoes: string | null
          orcamento_max: number | null
          orcamento_min: number | null
          origem: Database["public"]["Enums"]["lead_origem"]
          origem_url: string | null
          perfil_busca: string | null
          status_funil: Database["public"]["Enums"]["lead_status"]
          tags: string[] | null
          telefone: string
          tipo_imovel: string | null
          updated_at: string
        }
        Insert: {
          bairro_interesse?: string | null
          cidade_interesse?: string | null
          corretor_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          finalidade?: string | null
          id?: string
          imovel_interesse_codigo?: string | null
          last_contact_at?: string | null
          nome: string
          observacoes?: string | null
          orcamento_max?: number | null
          orcamento_min?: number | null
          origem?: Database["public"]["Enums"]["lead_origem"]
          origem_url?: string | null
          perfil_busca?: string | null
          status_funil?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          telefone: string
          tipo_imovel?: string | null
          updated_at?: string
        }
        Update: {
          bairro_interesse?: string | null
          cidade_interesse?: string | null
          corretor_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          finalidade?: string | null
          id?: string
          imovel_interesse_codigo?: string | null
          last_contact_at?: string | null
          nome?: string
          observacoes?: string | null
          orcamento_max?: number | null
          orcamento_min?: number | null
          origem?: Database["public"]["Enums"]["lead_origem"]
          origem_url?: string | null
          perfil_busca?: string | null
          status_funil?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          telefone?: string
          tipo_imovel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          email: string
          especialidades: string[] | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email: string
          especialidades?: string[] | null
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          especialidades?: string[] | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      property_geocodes: {
        Row: {
          created_at: string
          geocoded_address: string | null
          id: string
          is_approximate: boolean
          latitude: number | null
          longitude: number | null
          property_code: number
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          geocoded_address?: string | null
          id?: string
          is_approximate?: boolean
          latitude?: number | null
          longitude?: number | null
          property_code: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          geocoded_address?: string | null
          id?: string
          is_approximate?: boolean
          latitude?: number | null
          longitude?: number | null
          property_code?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          created_at: string
          created_by: string | null
          data_hora: string
          descricao: string | null
          id: string
          imovel_id: string | null
          lead_id: string | null
          lembrete_enviado: boolean
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id: string
          status: Database["public"]["Enums"]["tarefa_status"]
          tipo: Database["public"]["Enums"]["tarefa_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_hora: string
          descricao?: string | null
          id?: string
          imovel_id?: string | null
          lead_id?: string | null
          lembrete_enviado?: boolean
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id: string
          status?: Database["public"]["Enums"]["tarefa_status"]
          tipo?: Database["public"]["Enums"]["tarefa_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_hora?: string
          descricao?: string | null
          id?: string
          imovel_id?: string | null
          lead_id?: string | null
          lembrete_enviado?: boolean
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel_id?: string
          status?: Database["public"]["Enums"]["tarefa_status"]
          tipo?: Database["public"]["Enums"]["tarefa_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis_proprios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      count_admins: { Args: never; Returns: number }
      distribuir_lead: { Args: { _lead_id: string }; Returns: string }
      find_duplicate_lead: {
        Args: { _email: string; _telefone: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
      is_crm_user: { Args: { _user_id: string }; Returns: boolean }
      setup_first_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestor" | "corretor" | "atendente"
      distribuicao_tipo:
        | "rodizio"
        | "especialidade"
        | "equipe"
        | "carga"
        | "manual"
      imovel_status:
        | "disponivel"
        | "sob_proposta"
        | "vendido"
        | "alugado"
        | "inativo"
      interacao_tipo: "ligacao" | "whatsapp" | "email" | "visita" | "nota"
      lead_origem:
        | "site_avaliacao"
        | "site_contato"
        | "site_whatsapp"
        | "portal"
        | "rede_social"
        | "indicacao"
        | "manual"
        | "importado"
      lead_status:
        | "novo"
        | "em_atendimento"
        | "visita_agendada"
        | "proposta_enviada"
        | "fechamento"
        | "perdido"
      tarefa_prioridade: "baixa" | "media" | "alta"
      tarefa_status: "pendente" | "concluida" | "cancelada"
      tarefa_tipo:
        | "ligacao"
        | "whatsapp"
        | "email"
        | "visita"
        | "reuniao"
        | "outro"
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
      app_role: ["admin", "gestor", "corretor", "atendente"],
      distribuicao_tipo: [
        "rodizio",
        "especialidade",
        "equipe",
        "carga",
        "manual",
      ],
      imovel_status: [
        "disponivel",
        "sob_proposta",
        "vendido",
        "alugado",
        "inativo",
      ],
      interacao_tipo: ["ligacao", "whatsapp", "email", "visita", "nota"],
      lead_origem: [
        "site_avaliacao",
        "site_contato",
        "site_whatsapp",
        "portal",
        "rede_social",
        "indicacao",
        "manual",
        "importado",
      ],
      lead_status: [
        "novo",
        "em_atendimento",
        "visita_agendada",
        "proposta_enviada",
        "fechamento",
        "perdido",
      ],
      tarefa_prioridade: ["baixa", "media", "alta"],
      tarefa_status: ["pendente", "concluida", "cancelada"],
      tarefa_tipo: [
        "ligacao",
        "whatsapp",
        "email",
        "visita",
        "reuniao",
        "outro",
      ],
    },
  },
} as const
