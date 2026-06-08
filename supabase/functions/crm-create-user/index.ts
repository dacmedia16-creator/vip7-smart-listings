import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES = ['admin', 'gestor', 'corretor', 'atendente', 'sem_acesso'] as const;
type Role = (typeof ROLES)[number];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ ok: false, error: 'Não autenticado' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ ok: false, error: 'Sessão inválida' }, 401);
    }
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(url, service);

    const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    });
    if (roleErr || !isAdmin) {
      return json({ ok: false, error: 'Apenas admin pode criar usuários' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const nome = String(body.nome ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const senha = String(body.senha ?? '');
    const telefone = body.telefone ? String(body.telefone).trim() : null;
    const role = String(body.role ?? 'sem_acesso') as Role;
    const ativo = body.ativo !== false;

    if (nome.length < 2) return json({ ok: false, error: 'Nome inválido' }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'Email inválido' }, 400);
    if (senha.length < 8) return json({ ok: false, error: 'Senha deve ter no mínimo 8 caracteres' }, 400);
    if (!ROLES.includes(role)) return json({ ok: false, error: 'Perfil inválido' }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, telefone },
    });
    if (createErr || !created?.user) {
      return json({ ok: false, error: createErr?.message ?? 'Falha ao criar usuário' }, 400);
    }

    const newUserId = created.user.id;

    try {
      await admin
        .from('profiles')
        .update({ nome, telefone, ativo, email })
        .eq('id', newUserId);

      if (role !== 'sem_acesso') {
        const { error: rErr } = await admin
          .from('user_roles')
          .insert({ user_id: newUserId, role });
        if (rErr) throw rErr;
      }
    } catch (e) {
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return json({ ok: false, error: `Rollback: ${(e as Error).message}` }, 500);
    }

    return json({ ok: true, user_id: newUserId });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
