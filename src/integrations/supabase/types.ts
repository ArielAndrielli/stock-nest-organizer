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
      caixas: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
          quantidade: number
          vaga_id: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          quantidade?: number
          vaga_id: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          quantidade?: number
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caixas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      compromissos: {
        Row: {
          atualizado_em: string
          categoria: string
          criado_em: string
          criado_por: string | null
          criado_por_email: string | null
          descricao: string | null
          dia_inteiro: boolean
          fim: string | null
          id: string
          inicio: string
          local: string | null
          ordem_id: string | null
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          criado_por?: string | null
          criado_por_email?: string | null
          descricao?: string | null
          dia_inteiro?: boolean
          fim?: string | null
          id?: string
          inicio: string
          local?: string | null
          ordem_id?: string | null
          titulo: string
        }
        Update: {
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          criado_por?: string | null
          criado_por_email?: string | null
          descricao?: string | null
          dia_inteiro?: boolean
          fim?: string | null
          id?: string
          inicio?: string
          local?: string | null
          ordem_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "compromissos_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_campos: {
        Row: {
          atualizado_em: string
          chave: string
          criado_em: string
          filtravel: boolean
          fixo: boolean
          id: string
          ordem: number
          rotulo: string
          tipo: string
          visivel_padrao: boolean
        }
        Insert: {
          atualizado_em?: string
          chave: string
          criado_em?: string
          filtravel?: boolean
          fixo?: boolean
          id?: string
          ordem?: number
          rotulo: string
          tipo?: string
          visivel_padrao?: boolean
        }
        Update: {
          atualizado_em?: string
          chave?: string
          criado_em?: string
          filtravel?: boolean
          fixo?: boolean
          id?: string
          ordem?: number
          rotulo?: string
          tipo?: string
          visivel_padrao?: boolean
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          atualizado_em: string
          cidade: string | null
          cnpj: string | null
          codigo: number | null
          criado_em: string
          email: string | null
          extras: Json
          id: string
          inscricao_estadual: string | null
          nome: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          atualizado_em?: string
          cidade?: string | null
          cnpj?: string | null
          codigo?: number | null
          criado_em?: string
          email?: string | null
          extras?: Json
          id?: string
          inscricao_estadual?: string | null
          nome: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          atualizado_em?: string
          cidade?: string | null
          cnpj?: string | null
          codigo?: number | null
          criado_em?: string
          email?: string | null
          extras?: Json
          id?: string
          inscricao_estadual?: string | null
          nome?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      historico_eventos: {
        Row: {
          acao: string
          criado_em: string
          detalhes: Json | null
          entidade: string
          entidade_id: string | null
          entidade_nome: string | null
          id: string
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          detalhes?: Json | null
          entidade: string
          entidade_id?: string | null
          entidade_nome?: string | null
          id?: string
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          detalhes?: Json | null
          entidade?: string
          entidade_id?: string | null
          entidade_nome?: string | null
          id?: string
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      item_campos: {
        Row: {
          atualizado_em: string
          chave: string
          criado_em: string
          filtravel: boolean
          fixo: boolean
          id: string
          ordem: number
          rotulo: string
          tipo: string
          visivel_padrao: boolean
        }
        Insert: {
          atualizado_em?: string
          chave: string
          criado_em?: string
          filtravel?: boolean
          fixo?: boolean
          id?: string
          ordem?: number
          rotulo: string
          tipo?: string
          visivel_padrao?: boolean
        }
        Update: {
          atualizado_em?: string
          chave?: string
          criado_em?: string
          filtravel?: boolean
          fixo?: boolean
          id?: string
          ordem?: number
          rotulo?: string
          tipo?: string
          visivel_padrao?: boolean
        }
        Relationships: []
      }
      item_preferencias: {
        Row: {
          atualizado_em: string
          colunas_visiveis: string[]
          criado_em: string
          id: string
          modo_visualizacao: string
          ordem_colunas: string[]
          por_pagina: number
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          colunas_visiveis?: string[]
          criado_em?: string
          id?: string
          modo_visualizacao?: string
          ordem_colunas?: string[]
          por_pagina?: number
          user_id: string
        }
        Update: {
          atualizado_em?: string
          colunas_visiveis?: string[]
          criado_em?: string
          id?: string
          modo_visualizacao?: string
          ordem_colunas?: string[]
          por_pagina?: number
          user_id?: string
        }
        Relationships: []
      }
      itens: {
        Row: {
          atualizado_em: string
          codigo_interno: number
          criado_em: string
          descricao: string | null
          extras: Json
          id: string
          imagem_url: string | null
          marca: string | null
          referencia: string | null
          setor: string | null
          status: string | null
          tipo_item: string | null
        }
        Insert: {
          atualizado_em?: string
          codigo_interno: number
          criado_em?: string
          descricao?: string | null
          extras?: Json
          id?: string
          imagem_url?: string | null
          marca?: string | null
          referencia?: string | null
          setor?: string | null
          status?: string | null
          tipo_item?: string | null
        }
        Update: {
          atualizado_em?: string
          codigo_interno?: number
          criado_em?: string
          descricao?: string | null
          extras?: Json
          id?: string
          imagem_url?: string | null
          marca?: string | null
          referencia?: string | null
          setor?: string | null
          status?: string | null
          tipo_item?: string | null
        }
        Relationships: []
      }
      movimentacoes_caixa: {
        Row: {
          caixa_id: string
          criado_em: string
          id: string
          vaga_destino_id: string | null
          vaga_origem_id: string | null
        }
        Insert: {
          caixa_id: string
          criado_em?: string
          id?: string
          vaga_destino_id?: string | null
          vaga_origem_id?: string | null
        }
        Update: {
          caixa_id?: string
          criado_em?: string
          id?: string
          vaga_destino_id?: string | null
          vaga_origem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_caixa_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_caixa_vaga_destino_id_fkey"
            columns: ["vaga_destino_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_caixa_vaga_origem_id_fkey"
            columns: ["vaga_origem_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordem_itens: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          item_id: string | null
          ordem_id: string
          quantidade: number
          referencia: string | null
          tipo_material: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          item_id?: string | null
          ordem_id: string
          quantidade?: number
          referencia?: string | null
          tipo_material: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          item_id?: string | null
          ordem_id?: string
          quantidade?: number
          referencia?: string | null
          tipo_material?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordem_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordem_itens_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          criado_por_email: string | null
          descricao: string
          id: string
          imagem_url: string | null
          numero: string
          observacoes: string | null
          quantidade: number
          referencia: string
          status: Database["public"]["Enums"]["status_ordem"]
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          criado_por_email?: string | null
          descricao: string
          id?: string
          imagem_url?: string | null
          numero: string
          observacoes?: string | null
          quantidade?: number
          referencia: string
          status?: Database["public"]["Enums"]["status_ordem"]
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          criado_por_email?: string | null
          descricao?: string
          id?: string
          imagem_url?: string | null
          numero?: string
          observacoes?: string | null
          quantidade?: number
          referencia?: string
          status?: Database["public"]["Enums"]["status_ordem"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string | null
          id: string
          nome_exibicao: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email?: string | null
          id: string
          nome_exibicao?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string | null
          id?: string
          nome_exibicao?: string | null
        }
        Relationships: []
      }
      setores: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vagas: {
        Row: {
          capacidade: number
          codigo: string
          criado_em: string
          id: string
          imagem_url: string | null
          observacoes: string | null
          setor_id: string
        }
        Insert: {
          capacidade?: number
          codigo: string
          criado_em?: string
          id?: string
          imagem_url?: string | null
          observacoes?: string | null
          setor_id: string
        }
        Update: {
          capacidade?: number
          codigo?: string
          criado_em?: string
          id?: string
          imagem_url?: string | null
          observacoes?: string | null
          setor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vagas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_email: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pode_editar: { Args: { _user_id: string }; Returns: boolean }
      tem_papel: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "administrador" | "operador" | "visitante"
      status_ordem:
        | "aguardando_separacao"
        | "em_separacao"
        | "separacao_concluida"
        | "concluido"
        | "cancelado"
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
      app_role: ["administrador", "operador", "visitante"],
      status_ordem: [
        "aguardando_separacao",
        "em_separacao",
        "separacao_concluida",
        "concluido",
        "cancelado",
      ],
    },
  },
} as const
