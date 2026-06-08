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
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      cliente_imoveis: {
        Row: {
          cliente_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          imovel_id: string
          observacoes: string | null
          papel: Database["public"]["Enums"]["cliente_papel"]
          percentual: number | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          imovel_id: string
          observacoes?: string | null
          papel: Database["public"]["Enums"]["cliente_papel"]
          percentual?: number | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          imovel_id?: string
          observacoes?: string | null
          papel?: Database["public"]["Enums"]["cliente_papel"]
          percentual?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_imoveis_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_imoveis_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis_proprios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          categorias: string[]
          cep: string | null
          cidade: string | null
          codigo_imoview: number | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          imoview_hash: string | null
          imoview_raw: Json | null
          imoview_sync_at: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          origem: string
          rg: string | null
          telefone: string | null
          telefone_secundario: string | null
          tipo_pessoa: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          categorias?: string[]
          cep?: string | null
          cidade?: string | null
          codigo_imoview?: number | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          imoview_hash?: string | null
          imoview_raw?: Json | null
          imoview_sync_at?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          origem?: string
          rg?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          categorias?: string[]
          cep?: string | null
          cidade?: string | null
          codigo_imoview?: number | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          imoview_hash?: string | null
          imoview_raw?: Json | null
          imoview_sync_at?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          origem?: string
          rg?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Relationships: []
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
          aceita_financiamento: boolean
          aceita_permuta: boolean
          andar: string | null
          ano_construcao: number | null
          area: number | null
          area_externa: number | null
          area_total: number | null
          ativo: boolean
          bairro: string | null
          banheiros: number | null
          caracteristicas: string[] | null
          cartorio: string | null
          cep: string | null
          cib: string | null
          cidade: string | null
          codigo_auxiliar: string | null
          codigo_condominio_imoview: number | null
          codigo_imoview: number | null
          codigo_interno: string | null
          coef_aproveitamento: number | null
          comissao_venda_pct: number | null
          complemento: string | null
          condominio: number | null
          condominio_nome: string | null
          confront_dir: string | null
          confront_esq: string | null
          confront_frente: string | null
          confront_fundo: string | null
          construtora: string | null
          corretor_id: string | null
          created_at: string
          data_atualizacao_origem: string | null
          descricao: string | null
          descricao_avaliacao: string | null
          destaque: boolean
          destinacao: string | null
          documentos: Json | null
          edificio: string | null
          elevadores: number | null
          endereco: string | null
          estado: string | null
          etiquetas: string[] | null
          exclusivo: boolean
          finalidade: string
          folha_cartorio: string | null
          fotos: string[] | null
          horario_visita: string | null
          id: string
          identificador_chaves: string | null
          identificador_imovel: string | null
          imovel_alugado: boolean
          imovel_ocupado: boolean
          imoview_hash: string | null
          imoview_raw: Json | null
          imoview_sync_at: string | null
          iptu: number | null
          iptu_anual: number | null
          iptu_mensal: number | null
          latitude: number | null
          livro_cartorio: string | null
          local_chaves: string | null
          longitude: number | null
          m_direito: number | null
          m_esquerdo: number | null
          m_frente: number | null
          m_fundo: number | null
          matricula: string | null
          melhor_acesso: string | null
          meta_description: string | null
          mostrar_endereco: boolean
          na_planta: boolean
          notas_privadas: string | null
          num_andares: number | null
          num_chaves: number | null
          num_controles: number | null
          num_torres: number | null
          numero: string | null
          observacoes_internas: string | null
          origem: string
          permite_animais: boolean
          piso_acabamento: string | null
          placa_faixa: string | null
          ponto_referencia: string | null
          posicao_imovel: string | null
          preco: number
          quartos: number | null
          regiao: string | null
          rentabilidade_pct: number | null
          salas: number | null
          segundo_bairro: string | null
          segundo_tipo: string | null
          status: Database["public"]["Enums"]["imovel_status"]
          sub_regiao: string | null
          suites: number | null
          tipo: string
          tipo_complemento: string | null
          tipo_medida: string | null
          tipo_vaga: string | null
          titulo: string
          titulo_anuncio: string | null
          torre_bloco: string | null
          total_unidades: number | null
          tour_360_url: string | null
          tour_virtual_url: string | null
          unidades_por_andar: number | null
          updated_at: string
          vagas: number | null
          valor_anterior: number | null
          valor_avaliacao: number | null
          valor_m2: number | null
          valor_sob_consulta: boolean
          varandas: number | null
          venc_autorizacao_venda: string | null
          video_url: string | null
          youtube_url: string | null
          zona_uso: string | null
        }
        Insert: {
          aceita_financiamento?: boolean
          aceita_permuta?: boolean
          andar?: string | null
          ano_construcao?: number | null
          area?: number | null
          area_externa?: number | null
          area_total?: number | null
          ativo?: boolean
          bairro?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          cartorio?: string | null
          cep?: string | null
          cib?: string | null
          cidade?: string | null
          codigo_auxiliar?: string | null
          codigo_condominio_imoview?: number | null
          codigo_imoview?: number | null
          codigo_interno?: string | null
          coef_aproveitamento?: number | null
          comissao_venda_pct?: number | null
          complemento?: string | null
          condominio?: number | null
          condominio_nome?: string | null
          confront_dir?: string | null
          confront_esq?: string | null
          confront_frente?: string | null
          confront_fundo?: string | null
          construtora?: string | null
          corretor_id?: string | null
          created_at?: string
          data_atualizacao_origem?: string | null
          descricao?: string | null
          descricao_avaliacao?: string | null
          destaque?: boolean
          destinacao?: string | null
          documentos?: Json | null
          edificio?: string | null
          elevadores?: number | null
          endereco?: string | null
          estado?: string | null
          etiquetas?: string[] | null
          exclusivo?: boolean
          finalidade?: string
          folha_cartorio?: string | null
          fotos?: string[] | null
          horario_visita?: string | null
          id?: string
          identificador_chaves?: string | null
          identificador_imovel?: string | null
          imovel_alugado?: boolean
          imovel_ocupado?: boolean
          imoview_hash?: string | null
          imoview_raw?: Json | null
          imoview_sync_at?: string | null
          iptu?: number | null
          iptu_anual?: number | null
          iptu_mensal?: number | null
          latitude?: number | null
          livro_cartorio?: string | null
          local_chaves?: string | null
          longitude?: number | null
          m_direito?: number | null
          m_esquerdo?: number | null
          m_frente?: number | null
          m_fundo?: number | null
          matricula?: string | null
          melhor_acesso?: string | null
          meta_description?: string | null
          mostrar_endereco?: boolean
          na_planta?: boolean
          notas_privadas?: string | null
          num_andares?: number | null
          num_chaves?: number | null
          num_controles?: number | null
          num_torres?: number | null
          numero?: string | null
          observacoes_internas?: string | null
          origem?: string
          permite_animais?: boolean
          piso_acabamento?: string | null
          placa_faixa?: string | null
          ponto_referencia?: string | null
          posicao_imovel?: string | null
          preco: number
          quartos?: number | null
          regiao?: string | null
          rentabilidade_pct?: number | null
          salas?: number | null
          segundo_bairro?: string | null
          segundo_tipo?: string | null
          status?: Database["public"]["Enums"]["imovel_status"]
          sub_regiao?: string | null
          suites?: number | null
          tipo: string
          tipo_complemento?: string | null
          tipo_medida?: string | null
          tipo_vaga?: string | null
          titulo: string
          titulo_anuncio?: string | null
          torre_bloco?: string | null
          total_unidades?: number | null
          tour_360_url?: string | null
          tour_virtual_url?: string | null
          unidades_por_andar?: number | null
          updated_at?: string
          vagas?: number | null
          valor_anterior?: number | null
          valor_avaliacao?: number | null
          valor_m2?: number | null
          valor_sob_consulta?: boolean
          varandas?: number | null
          venc_autorizacao_venda?: string | null
          video_url?: string | null
          youtube_url?: string | null
          zona_uso?: string | null
        }
        Update: {
          aceita_financiamento?: boolean
          aceita_permuta?: boolean
          andar?: string | null
          ano_construcao?: number | null
          area?: number | null
          area_externa?: number | null
          area_total?: number | null
          ativo?: boolean
          bairro?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          cartorio?: string | null
          cep?: string | null
          cib?: string | null
          cidade?: string | null
          codigo_auxiliar?: string | null
          codigo_condominio_imoview?: number | null
          codigo_imoview?: number | null
          codigo_interno?: string | null
          coef_aproveitamento?: number | null
          comissao_venda_pct?: number | null
          complemento?: string | null
          condominio?: number | null
          condominio_nome?: string | null
          confront_dir?: string | null
          confront_esq?: string | null
          confront_frente?: string | null
          confront_fundo?: string | null
          construtora?: string | null
          corretor_id?: string | null
          created_at?: string
          data_atualizacao_origem?: string | null
          descricao?: string | null
          descricao_avaliacao?: string | null
          destaque?: boolean
          destinacao?: string | null
          documentos?: Json | null
          edificio?: string | null
          elevadores?: number | null
          endereco?: string | null
          estado?: string | null
          etiquetas?: string[] | null
          exclusivo?: boolean
          finalidade?: string
          folha_cartorio?: string | null
          fotos?: string[] | null
          horario_visita?: string | null
          id?: string
          identificador_chaves?: string | null
          identificador_imovel?: string | null
          imovel_alugado?: boolean
          imovel_ocupado?: boolean
          imoview_hash?: string | null
          imoview_raw?: Json | null
          imoview_sync_at?: string | null
          iptu?: number | null
          iptu_anual?: number | null
          iptu_mensal?: number | null
          latitude?: number | null
          livro_cartorio?: string | null
          local_chaves?: string | null
          longitude?: number | null
          m_direito?: number | null
          m_esquerdo?: number | null
          m_frente?: number | null
          m_fundo?: number | null
          matricula?: string | null
          melhor_acesso?: string | null
          meta_description?: string | null
          mostrar_endereco?: boolean
          na_planta?: boolean
          notas_privadas?: string | null
          num_andares?: number | null
          num_chaves?: number | null
          num_controles?: number | null
          num_torres?: number | null
          numero?: string | null
          observacoes_internas?: string | null
          origem?: string
          permite_animais?: boolean
          piso_acabamento?: string | null
          placa_faixa?: string | null
          ponto_referencia?: string | null
          posicao_imovel?: string | null
          preco?: number
          quartos?: number | null
          regiao?: string | null
          rentabilidade_pct?: number | null
          salas?: number | null
          segundo_bairro?: string | null
          segundo_tipo?: string | null
          status?: Database["public"]["Enums"]["imovel_status"]
          sub_regiao?: string | null
          suites?: number | null
          tipo?: string
          tipo_complemento?: string | null
          tipo_medida?: string | null
          tipo_vaga?: string | null
          titulo?: string
          titulo_anuncio?: string | null
          torre_bloco?: string | null
          total_unidades?: number | null
          tour_360_url?: string | null
          tour_virtual_url?: string | null
          unidades_por_andar?: number | null
          updated_at?: string
          vagas?: number | null
          valor_anterior?: number | null
          valor_avaliacao?: number | null
          valor_m2?: number | null
          valor_sob_consulta?: boolean
          varandas?: number | null
          venc_autorizacao_venda?: string | null
          video_url?: string | null
          youtube_url?: string | null
          zona_uso?: string | null
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
      imovel_portais: {
        Row: {
          created_at: string
          destaque_portal: boolean
          erro_validacao: string | null
          id: string
          imovel_id: string
          portal: Database["public"]["Enums"]["portal_imobiliario"]
          publicar: boolean
          ultimo_envio_em: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          destaque_portal?: boolean
          erro_validacao?: string | null
          id?: string
          imovel_id: string
          portal: Database["public"]["Enums"]["portal_imobiliario"]
          publicar?: boolean
          ultimo_envio_em?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          destaque_portal?: boolean
          erro_validacao?: string | null
          id?: string
          imovel_id?: string
          portal?: Database["public"]["Enums"]["portal_imobiliario"]
          publicar?: boolean
          ultimo_envio_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_portais_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis_proprios"
            referencedColumns: ["id"]
          },
        ]
      }
      imoview_sync_log: {
        Row: {
          created_at: string
          cursor: Json | null
          error_details: Json | null
          errors_count: number
          finished_at: string | null
          id: string
          inserted: number
          mode: string
          photos_uploaded: number
          removed: number
          started_at: string
          status: string
          total: number
          triggered_by: string | null
          unchanged: number
          updated: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cursor?: Json | null
          error_details?: Json | null
          errors_count?: number
          finished_at?: string | null
          id?: string
          inserted?: number
          mode?: string
          photos_uploaded?: number
          removed?: number
          started_at?: string
          status?: string
          total?: number
          triggered_by?: string | null
          unchanged?: number
          updated?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cursor?: Json | null
          error_details?: Json | null
          errors_count?: number
          finished_at?: string | null
          id?: string
          inserted?: number
          mode?: string
          photos_uploaded?: number
          removed?: number
          started_at?: string
          status?: string
          total?: number
          triggered_by?: string | null
          unchanged?: number
          updated?: number
          updated_at?: string
        }
        Relationships: []
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
          duracao_minutos: number | null
          id: string
          lead_id: string
          notas_internas: string | null
          proxima_acao_em: string | null
          resultado: string | null
          tipo: Database["public"]["Enums"]["interacao_tipo"]
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          descricao: string
          duracao_minutos?: number | null
          id?: string
          lead_id: string
          notas_internas?: string | null
          proxima_acao_em?: string | null
          resultado?: string | null
          tipo: Database["public"]["Enums"]["interacao_tipo"]
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          descricao?: string
          duracao_minutos?: number | null
          id?: string
          lead_id?: string
          notas_internas?: string | null
          proxima_acao_em?: string | null
          resultado?: string | null
          tipo?: Database["public"]["Enums"]["interacao_tipo"]
          updated_at?: string
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
          imoveis_carrinho_codigos: string[]
          imoveis_proposta_codigos: string[]
          imoveis_visita_codigos: string[]
          imovel_interesse_codigo: string | null
          last_contact_at: string | null
          nome: string
          observacoes: string | null
          orcamento_max: number | null
          orcamento_min: number | null
          origem: Database["public"]["Enums"]["lead_origem"]
          origem_url: string | null
          perfil_busca: string | null
          portal_origin: string | null
          portal_origin_lead_id: string | null
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
          imoveis_carrinho_codigos?: string[]
          imoveis_proposta_codigos?: string[]
          imoveis_visita_codigos?: string[]
          imovel_interesse_codigo?: string | null
          last_contact_at?: string | null
          nome: string
          observacoes?: string | null
          orcamento_max?: number | null
          orcamento_min?: number | null
          origem?: Database["public"]["Enums"]["lead_origem"]
          origem_url?: string | null
          perfil_busca?: string | null
          portal_origin?: string | null
          portal_origin_lead_id?: string | null
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
          imoveis_carrinho_codigos?: string[]
          imoveis_proposta_codigos?: string[]
          imoveis_visita_codigos?: string[]
          imovel_interesse_codigo?: string | null
          last_contact_at?: string | null
          nome?: string
          observacoes?: string | null
          orcamento_max?: number | null
          orcamento_min?: number | null
          origem?: Database["public"]["Enums"]["lead_origem"]
          origem_url?: string | null
          perfil_busca?: string | null
          portal_origin?: string | null
          portal_origin_lead_id?: string | null
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
          notif_email: boolean
          notif_whatsapp: boolean
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
          notif_email?: boolean
          notif_whatsapp?: boolean
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
          notif_email?: boolean
          notif_whatsapp?: boolean
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
          lembrete_1d_em: string | null
          lembrete_2h_em: string | null
          lembrete_30min_em: string | null
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
          lembrete_1d_em?: string | null
          lembrete_2h_em?: string | null
          lembrete_30min_em?: string | null
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
          lembrete_1d_em?: string | null
          lembrete_2h_em?: string | null
          lembrete_30min_em?: string | null
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
      can_manage_clientes: { Args: { _user_id: string }; Returns: boolean }
      count_admins: { Args: never; Returns: number }
      dashboard_funil_counts: {
        Args: never
        Returns: {
          status: string
          total: number
        }[]
      }
      dashboard_leads_por_dia: {
        Args: { _dias?: number }
        Returns: {
          dia: string
          total: number
        }[]
      }
      dashboard_pipeline_total: { Args: never; Returns: number }
      dashboard_ranking_corretores: {
        Args: { _limit?: number }
        Returns: {
          corretor_id: string
          nome: string
          total: number
        }[]
      }
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
      cliente_papel: "proprietario" | "comprador" | "locatario" | "interessado"
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
      portal_imobiliario: "zap_vivareal" | "olx" | "imovelweb" | "chavesnamao"
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
      cliente_papel: ["proprietario", "comprador", "locatario", "interessado"],
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
      portal_imobiliario: ["zap_vivareal", "olx", "imovelweb", "chavesnamao"],
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
