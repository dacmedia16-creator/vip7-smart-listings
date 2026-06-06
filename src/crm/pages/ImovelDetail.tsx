import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Building2, MapPin, BedDouble, Bath, Car, Ruler, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';
import { imovelStatusMeta } from '../lib/imoveis';
import { fmtMoney } from '../lib/leads';

export default function ImovelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isManager, isCorretor } = useRoles();
  const [imovel, setImovel] = useState<any>(null);
  const [corretor, setCorretor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('imoveis_proprios').select('*').eq('id', id!).maybeSingle();
      setImovel(data);
      if (data?.corretor_id) {
        const { data: p } = await supabase.from('profiles').select('id, nome, email').eq('id', data.corretor_id).maybeSingle();
        setCorretor(p);
      }
      setLoading(false);
    })();
  }, [id]);

  const canEdit = imovel && (isManager || (isCorretor && imovel.corretor_id === user?.id));
  const canDelete = imovel && (isManager || (isCorretor && imovel.corretor_id === user?.id));

  const handleDelete = async () => {
    const { error } = await supabase.from('imoveis_proprios').delete().eq('id', id!);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Imóvel excluído' });
    navigate('/crm/imoveis');
  };

  if (loading) return <CrmLayout><p className="text-muted-foreground">Carregando...</p></CrmLayout>;
  if (!imovel) return <CrmLayout><p className="text-muted-foreground">Imóvel não encontrado.</p></CrmLayout>;

  const status = imovelStatusMeta(imovel.status);

  return (
    <CrmLayout>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => navigate('/crm/imoveis')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
        <div className="flex gap-2">
          {canEdit && (
            <Button asChild variant="outline"><Link to={`/crm/imoveis/${id}/editar`}><Edit className="h-4 w-4 mr-1" />Editar</Link></Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-1" />Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir imóvel?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card className="overflow-hidden mb-6">
        {imovel.fotos?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            <div className="col-span-2 row-span-2 aspect-square md:aspect-auto">
              <img src={imovel.fotos[0]} alt={imovel.titulo} className="w-full h-full object-cover" />
            </div>
            {imovel.fotos.slice(1, 5).map((f: string, i: number) => (
              <div key={i} className="aspect-square"><img src={f} className="w-full h-full object-cover" /></div>
            ))}
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <Building2 className="h-16 w-16 text-muted-foreground/40" />
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
              <div>
                <p className="text-xs text-muted-foreground">{imovel.codigo_interno || '—'} · {imovel.tipo}</p>
                <h1 className="text-2xl font-bold">{imovel.titulo}</h1>
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {[imovel.endereco, imovel.bairro, imovel.cidade].filter(Boolean).join(', ') || 'Sem endereço'}
                </p>
              </div>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            <p className="text-3xl font-bold text-primary mt-4">{fmtMoney(Number(imovel.preco))}</p>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              {imovel.quartos != null && <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{imovel.quartos} quartos</span>}
              {imovel.banheiros != null && <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{imovel.banheiros} banheiros</span>}
              {imovel.vagas != null && <span className="flex items-center gap-1"><Car className="h-4 w-4" />{imovel.vagas} vagas</span>}
              {imovel.area != null && <span className="flex items-center gap-1"><Ruler className="h-4 w-4" />{imovel.area} m²</span>}
            </div>
          </Card>

          {imovel.descricao && (
            <Card className="p-6">
              <h2 className="font-semibold mb-2">Descrição</h2>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{imovel.descricao}</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Valores</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Preço</span><span>{fmtMoney(Number(imovel.preco))}</span></div>
              {imovel.condominio && <div className="flex justify-between"><span className="text-muted-foreground">Condomínio</span><span>{fmtMoney(Number(imovel.condominio))}</span></div>}
              {imovel.iptu && <div className="flex justify-between"><span className="text-muted-foreground">IPTU</span><span>{fmtMoney(Number(imovel.iptu))}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Finalidade</span><span className="capitalize">{imovel.finalidade}</span></div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><UserIcon className="h-4 w-4" />Responsável</h3>
            {corretor ? (
              <div className="text-sm">
                <p className="font-medium">{corretor.nome}</p>
                <p className="text-muted-foreground text-xs">{corretor.email}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum corretor atribuído.</p>
            )}
          </Card>
        </div>
      </div>
    </CrmLayout>
  );
}
