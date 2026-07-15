// Importa dados completos da planilha "Imoveis Ativos" do Imoview.
// Faz UPDATE em imoveis_proprios usando codigo_imoview (coluna "Codigo").
// Nunca cria imóvel novo, nunca sobrescreve fotos/geocode/codigo_interno.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = Record<string, unknown>;

const s = (v: unknown): string => (v == null ? "" : String(v)).trim();
const txt = (v: unknown): string | null => { const x = s(v); return x ? x : null; };

function brNum(v: unknown): number | null {
  const x = s(v).replace(/[R$\s%]/g, "");
  if (!x) return null;
  // "1.234,56" -> 1234.56 ; "1234.56" tb ok
  const normalized = x.includes(",")
    ? x.replace(/\./g, "").replace(",", ".")
    : x;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
function toInt(v: unknown): number | null {
  const n = brNum(v);
  return n == null ? null : Math.trunc(n);
}
function boolSN(v: unknown): boolean | null {
  const x = s(v).toLowerCase();
  if (!x || x === "-" || x === "n/a") return null;
  if (["sim", "s", "true", "1", "yes"].includes(x)) return true;
  if (["nao", "não", "n", "false", "0", "no"].includes(x)) return false;
  return null;
}
function brDate(v: unknown): string | null {
  const x = s(v);
  if (!x) return null;
  // dd/mm/yyyy [hh:mm[:ss]]
  const m = x.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, d, mo, y, hh, mm, ss] = m;
    if (hh) return `${y}-${mo}-${d}T${hh}:${mm}:${ss ?? "00"}`;
    return `${y}-${mo}-${d}`;
  }
  const iso = x.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return x.slice(0, 10);
  return null;
}
function splitTags(v: unknown): string[] | null {
  const x = s(v);
  if (!x) return null;
  const arr = x.split(/[;|,]/).map((t) => t.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

// Colunas Sim/Não → label a incluir em caracteristicas[] quando true
const CARACTERISTICAS_MAP: Record<string, string> = {
  ArCondicionado: "Ar-condicionado",
  ArmarioBanheiro: "Armário no banheiro",
  ArmarioCozinha: "Armário na cozinha",
  ArmarioQuarto: "Armário no quarto",
  BoxBanheiro: "Box no banheiro",
  Closet: "Closet",
  Dce: "DCE",
  Despensa: "Despensa",
  Escritorio: "Escritório",
  Lavabo: "Lavabo",
  Mobiliado: "Mobiliado",
  Rouparia: "Rouparia",
  SolManha: "Sol da manhã",
  VistaMar: "Vista para o mar",
  AguaIndividual: "Água individual",
  Alarme: "Alarme",
  AquecimentoEletrico: "Aquecimento elétrico",
  AquecimentoGas: "Aquecimento a gás",
  AquecimentoSolar: "Aquecimento solar",
  BoxDespejo: "Box de despejo",
  CercaEletrica: "Cerca elétrica",
  CircuitoTv: "Circuito de TV",
  GasCanalizado: "Gás canalizado",
  Interfone: "Interfone",
  Jardim: "Jardim",
  Lavanderia: "Lavanderia",
  PortaoEletronico: "Portão eletrônico",
  Portaria24H: "Portaria 24h",
  Academia: "Academia",
  Churrasqueira: "Churrasqueira",
  Hidromassagem: "Hidromassagem",
  HomeCinanema: "Home cinema",
  Piscina: "Piscina",
  Playground: "Playground",
  QuadraPoliesportiva: "Quadra poliesportiva",
  QuadraTenis: "Quadra de tênis",
  SalaMassagem: "Sala de massagem",
  SalaoFestas: "Salão de festas",
  SalaoJogos: "Salão de jogos",
  Sauna: "Sauna",
  Wifi: "Wi-Fi",
};

const PORTAIS_MAP: Record<string, string> = {
  PortalOlxBrasil: "olx",
  PortalImovelWeb: "imovelweb",
  CasaMineira: "casamineira",
  MercadoLivre: "mercadolivre",
  Facebook: "facebook",
  ChaveFacil: "chavefacil",
  LugarCerto: "lugarcerto",
  ChavesNaMao: "chavesnamao",
  ExibirMeuSite: "site_proprio",
};

function normalizeFinalidade(v: unknown): string | null {
  const x = s(v).toLowerCase();
  if (!x) return null;
  if (x.includes("loca") || x.includes("alug")) return "locacao";
  if (x.includes("vend")) return "venda";
  if (x.includes("temp")) return "temporada";
  return null;
}

function buildPatch(row: Row) {
  const codigoRaw = s(row.Codigo);
  const codigo = codigoRaw ? parseInt(codigoRaw.replace(/\D/g, ""), 10) : NaN;
  if (!Number.isFinite(codigo)) return { error: "Codigo ausente/invalido" as const };

  const caracteristicas: string[] = [];
  for (const [col, label] of Object.entries(CARACTERISTICAS_MAP)) {
    if (boolSN(row[col]) === true) caracteristicas.push(label);
  }

  const portais: Record<string, boolean> = {};
  for (const [col, key] of Object.entries(PORTAIS_MAP)) {
    const b = boolSN(row[col]);
    if (b != null) portais[key] = b;
  }

  const patch: Record<string, unknown> = {
    // Identificação / status
    codigo_auxiliar: txt(row.CodigoAuxiliar),
    destinacao: txt(row.Destinacao),
    situacao_imoview: txt(row.Situacao),
    motivo_desativacao: txt(row.MotivoDesativacao),
    finalidade: normalizeFinalidade(row.Finalidade),
    tipo: txt(row.Tipo),
    segundo_tipo: txt(row.Tipo2),
    identificador_imovel: txt(row.IdenticadorImovel),

    // Chaves
    local_chaves: txt(row.LocalChave),
    identificador_chaves: txt(row.IdenticadorChave),
    num_chaves: toInt(row.NumeroChave),
    num_controles: toInt(row.NumeroControle),
    numero_controle: txt(row.NumeroControle),

    // Empreendimento
    construtora: txt(row.Construtora),
    idade_edificacao: txt(row.Idade),
    horario_visita: txt(row.HorarioVisita),
    edificio: txt(row.Empreendimento),
    condominio_nome: txt(row.Condominio),
    administradora: txt(row.Administradora),
    administradora_telefone: txt(row.AdministradoraTelefone),
    administradora_email: txt(row.AdministradoraEmail),
    sindico: txt(row.Sindico),
    sindico_telefone: txt(row.SindicoTelefone),
    sindico_email: txt(row.SindicoEmail),
    na_planta: boolSN(row.NaPlanta),
    exclusivo: boolSN(row.Exclusivo),
    placa_faixa: txt(row.Placa),

    // Valores
    preco: brNum(row.Valor),
    valor_anterior: brNum(row.ValorAnterior),
    condominio: brNum(row.ValorCondominio),
    iptu_mensal: brNum(row.ValorIptu),
    iptu_anual: brNum(row.ValorIptuAnual),
    iptu_indice: txt(row.IndiceIptu),
    rentabilidade_pct: brNum(row.Rentabilidade),
    taxa_administracao_pct: brNum(row.TaxaAdministracao),
    taxa_intermediacao_pct: brNum(row.TaxaIntermediacao),
    comissao_venda_pct: brNum(row.ComissaoVenda),
    seguro_incendio_valor: brNum(row.ValorSeguroIncendio),
    seguro_incendio_parcela: brNum(row.ValorParcelaSeguroIncendio),

    // Endereço
    cep: txt(row.Cep),
    endereco: txt(row.Endereco),
    numero: txt(row.EnderecoNumero),
    complemento: txt(row.Complemento),
    torre_bloco: txt(row.Bloco),
    bairro: txt(row.Bairro),
    segundo_bairro: txt(row.Bairro2),
    cidade: txt(row.Cidade),
    estado: txt(row.Estado),
    regiao: txt(row.Regiao),
    ponto_referencia: txt(row.PontoReferencia),
    melhor_acesso: txt(row.MelhorAcesso),

    // Áreas
    area_lote: brNum(row.AreaLote),
    area_interna: brNum(row.AreaInterna),
    area_externa: brNum(row.AreaExterna),
    area_privativa: brNum(row.AreaPrivativa),
    area_servico: brNum(row.AreaServico),
    zona_uso: txt(row.ZonaUso),
    coef_aproveitamento: brNum(row.CoeficienteAprov),

    // Cômodos
    andar: txt(row.Andar),
    piso_acabamento: txt(row.PisoAcabamento),
    posicao_imovel: txt(row.PosicaoImovel),
    quartos: toInt(row.NumeroQuarto),
    salas: toInt(row.NumeroSala),
    banheiros: toInt(row.NumeroBanheiro),
    suites: toInt(row.NumeroSuite),
    varandas: toInt(row.NumeroVaranda),
    vagas: toInt(row.NumeroVaga),
    tipo_vaga: txt(row.TipoVaga),

    // Prédio
    elevadores: toInt(row.NumeroElevador),
    num_torres: toInt(row.NumeroTorres),
    num_andares: toInt(row.NumeroAndar),
    unidades_por_andar: toInt(row.NumeroUnidadesAndar),
    total_unidades: toInt(row.TotalUnidades),

    // Pessoas
    captadores: txt(row.Captadores),
    indicado_por: txt(row.IndicadoPor),

    // Datas
    data_atualizacao_origem: brDate(row.DataHoraUltimaAlteracao),
    data_entrega: brDate(row.DataEntrega),
    data_vago_desde: brDate(row.DataVagoDesde),
    venc_autorizacao_venda: brDate(row.DataVencimentoAutorizacao),

    // Registro
    padrao: txt(row.Padrao),
    cartorio: txt(row.Cartorio),
    matricula: txt(row.MatriculaCartorio),
    livro_cartorio: txt(row.LivroCartorio),
    folha_cartorio: txt(row.FolhaCartorio),
    agua_identificador: txt(row.AguaIdentificador),
    agua_matricula: txt(row.AguaMatricula),
    luz_numero_cliente: txt(row.LuzNumeroCliente),
    luz_numero_instalacao: txt(row.LuzNumeroInstalacao),

    // Marketing
    descricao: txt(row.Descricao),
    notas_privadas: txt(row.Anotacoes),
    pontuacao: brNum(row.Pontuacao),
  };

  const etiquetas = splitTags(row.Etiquetas);

  // Remove chaves com valor null/undefined pra não zerar dados existentes
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== null && v !== undefined && v !== "") clean[k] = v;
  }
  if (caracteristicas.length) clean.caracteristicas = caracteristicas;
  if (etiquetas) clean.etiquetas = etiquetas;
  if (Object.keys(portais).length) clean.portais_publicados = portais;

  return { codigo, patch: clean };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    // checa role
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = ((roleData as { role: string }[]) ?? []).map((r) => r.role);
    if (!roles.includes("admin") && !roles.includes("gestor")) {
      return new Response(JSON.stringify({ error: "Somente admin/gestor" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { rows: Row[]; dryRun?: boolean };
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "rows[] vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rows.length > 200) {
      return new Response(JSON.stringify({ error: "Lote máximo: 200 linhas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pré-carrega códigos existentes
    const codigos: number[] = [];
    const patches: { codigo: number; patch: Record<string, unknown> }[] = [];
    const erros: { linha: number; motivo: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const built = buildPatch(rows[i]);
      if ("error" in built) {
        erros.push({ linha: i + 2, motivo: built.error });
        continue;
      }
      codigos.push(built.codigo);
      patches.push({ codigo: built.codigo, patch: built.patch });
    }

    const existentes = new Set<number>();
    if (codigos.length) {
      const { data } = await admin
        .from("imoveis_proprios")
        .select("codigo_imoview")
        .in("codigo_imoview", codigos);
      for (const r of (data as { codigo_imoview: number }[]) ?? []) {
        existentes.add(r.codigo_imoview);
      }
    }

    const naoEncontrados: number[] = [];
    let atualizados = 0;

    if (body.dryRun) {
      for (const p of patches) {
        if (!existentes.has(p.codigo)) naoEncontrados.push(p.codigo);
      }
      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          total: rows.length,
          atualizariam: patches.length - naoEncontrados.length,
          nao_encontrados: naoEncontrados.length,
          nao_encontrados_amostra: naoEncontrados.slice(0, 50),
          erros,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    for (const p of patches) {
      if (!existentes.has(p.codigo)) {
        naoEncontrados.push(p.codigo);
        continue;
      }
      const { error } = await admin
        .from("imoveis_proprios")
        .update(p.patch)
        .eq("codigo_imoview", p.codigo);
      if (error) {
        erros.push({ linha: 0, motivo: `codigo ${p.codigo}: ${error.message}` });
      } else {
        atualizados++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: rows.length,
        atualizados,
        nao_encontrados: naoEncontrados.length,
        nao_encontrados_amostra: naoEncontrados.slice(0, 50),
        erros,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
