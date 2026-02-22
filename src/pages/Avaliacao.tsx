import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollReveal } from '@/components/ScrollReveal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Home, 
  MapPin, 
  Ruler, 
  BedDouble, 
  Bath, 
  Car, 
  User, 
  CheckCircle2,
  Building,
  FileText,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Loader2,
} from 'lucide-react';

const avaliacaoSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório').max(100),
  email: z.string().email('Email inválido').max(255),
  telefone: z.string().min(10, 'Telefone inválido').max(20),
  tipoImovel: z.string().min(1, 'Selecione o tipo de imóvel'),
  finalidade: z.string().min(1, 'Selecione a finalidade'),
  cep: z.string().max(9).optional(),
  endereco: z.string().min(5, 'Endereço é obrigatório').max(200),
  bairro: z.string().min(2, 'Bairro é obrigatório').max(100),
  cidade: z.string().min(2, 'Cidade é obrigatória').max(100),
  areaTotal: z.string().optional(),
  areaConstruida: z.string().optional(),
  quartos: z.string().optional(),
  banheiros: z.string().optional(),
  vagas: z.string().optional(),
  descricao: z.string().max(1000).optional(),
});

type AvaliacaoFormData = z.infer<typeof avaliacaoSchema>;

interface Estimativa {
  valorEstimadoMin: number;
  valorEstimadoMax: number;
  valorM2Medio: number;
  imoveisComparados: number;
  analise: string;
  confianca: 'alta' | 'media' | 'baixa';
}

const beneficios = [
  { icon: CheckCircle2, text: 'Avaliação profissional e gratuita' },
  { icon: CheckCircle2, text: 'Análise de mercado completa' },
  { icon: CheckCircle2, text: 'Resposta em até 24 horas' },
  { icon: CheckCircle2, text: 'Sem compromisso' },
];

const confiancaConfig = {
  alta: { label: 'Alta Confiança', variant: 'default' as const, className: 'bg-green-600 hover:bg-green-700' },
  media: { label: 'Confiança Média', variant: 'default' as const, className: 'bg-yellow-600 hover:bg-yellow-700' },
  baixa: { label: 'Baixa Confiança', variant: 'default' as const, className: 'bg-red-600 hover:bg-red-700' },
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function enviarEmail(data: AvaliacaoFormData) {
  return supabase.functions.invoke('send-avaliacao-email', {
    body: {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      tipoImovel: data.tipoImovel,
      finalidade: data.finalidade,
      cep: data.cep,
      endereco: data.endereco,
      bairro: data.bairro,
      cidade: data.cidade,
      areaTotal: data.areaTotal,
      areaConstruida: data.areaConstruida,
      quartos: data.quartos,
      banheiros: data.banheiros,
      vagas: data.vagas,
      observacoes: data.descricao,
    },
  });
}

export default function Avaliacao() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [estimativa, setEstimativa] = useState<Estimativa | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const form = useForm<AvaliacaoFormData>({
    resolver: zodResolver(avaliacaoSchema),
    defaultValues: {
      nome: '', email: '', telefone: '', tipoImovel: '', finalidade: '',
      cep: '', endereco: '', bairro: '', cidade: '', areaTotal: '', areaConstruida: '',
      quartos: '', banheiros: '', vagas: '', descricao: '',
    },
  });

  const handleCepChange = useCallback(async (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    form.setValue('cep', masked);

    if (digits.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          toast({ title: 'CEP não encontrado', description: 'Verifique o CEP e tente novamente.', variant: 'destructive' });
        } else {
          if (data.logradouro) form.setValue('endereco', data.logradouro);
          if (data.bairro) form.setValue('bairro', data.bairro);
          if (data.localidade) form.setValue('cidade', data.localidade);
        }
      } catch {
        toast({ title: 'Erro ao buscar CEP', description: 'Não foi possível consultar o CEP.', variant: 'destructive' });
      } finally {
        setIsLoadingCep(false);
      }
    }
  }, [form, toast]);

  const onSubmit = async (data: AvaliacaoFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await enviarEmail(data);
      if (error) throw error;
      toast({ title: 'Solicitação enviada com sucesso!', description: 'Entraremos em contato em até 24 horas.' });
      form.reset();
    } catch (error: any) {
      console.error('Error sending avaliacao:', error);
      toast({ title: 'Erro ao enviar', description: 'Tente novamente ou entre em contato pelo WhatsApp.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEstimarIA = async () => {
    // Validate essential fields manually
    const values = form.getValues();
    const essentialFields = ['tipoImovel', 'finalidade', 'cidade', 'bairro'] as const;
    const missingFields = essentialFields.filter(f => !values[f]);
    
    if (missingFields.length > 0) {
      toast({ title: 'Preencha os campos obrigatórios', description: 'Tipo, finalidade, cidade e bairro são necessários para a estimativa.', variant: 'destructive' });
      return;
    }

    if (!values.areaTotal && !values.areaConstruida) {
      toast({ title: 'Informe a área do imóvel', description: 'Pelo menos a área total ou construída é necessária para estimar o valor.', variant: 'destructive' });
      return;
    }

    setIsEstimating(true);
    setEstimativa(null);

    try {
      // Call AI estimation
      const { data, error } = await supabase.functions.invoke('avaliacao-ia', {
        body: {
          tipoImovel: values.tipoImovel,
          finalidade: values.finalidade,
          cidade: values.cidade,
          bairro: values.bairro,
          cep: values.cep,
          areaTotal: values.areaTotal,
          areaConstruida: values.areaConstruida,
          quartos: values.quartos,
          banheiros: values.banheiros,
          vagas: values.vagas,
          descricao: values.descricao,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: 'Não foi possível estimar', description: data.error, variant: 'destructive' });
        return;
      }

      if (data?.estimativa) {
        setEstimativa(data.estimativa);
        // Scroll to result after a short delay
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      }

      // Also send email in background
      const isFormValid = await form.trigger();
      if (isFormValid) {
        enviarEmail(form.getValues()).catch(err => console.error('Email send error:', err));
      }
    } catch (error: any) {
      console.error('Error estimating:', error);
      toast({ title: 'Erro ao estimar valor', description: 'Tente novamente em alguns instantes.', variant: 'destructive' });
    } finally {
      setIsEstimating(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-b from-secondary to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide mb-6">
                ✨ ESTIMATIVA INSTANTÂNEA COM IA
              </span>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
                Descubra o Valor Real do{' '}
                <span className="text-primary">Seu Imóvel</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Saiba o valor do seu imóvel na hora com nossa{' '}
                <span className="text-primary font-semibold">IA especializada no mercado imobiliário da região de Sorocaba</span>. 
                Análise instantânea baseada em imóveis comparáveis reais — ou solicite uma avaliação profissional gratuita com nossos especialistas.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-8 bg-background border-y border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            {beneficios.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <Card className="border-border/50 shadow-xl">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl md:text-3xl font-display">
                    Preencha os Dados do Imóvel
                  </CardTitle>
                  <CardDescription className="text-base">
                    Quanto mais informações, mais precisa será a avaliação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      {/* Dados do Proprietário */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          Seus Dados
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="nome" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl><Input placeholder="Seu nome" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="telefone" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone *</FormLabel>
                              <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Tipo e Finalidade */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Building className="h-5 w-5 text-primary" />
                          Tipo do Imóvel
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="tipoImovel" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Imóvel *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="apartamento">Apartamento</SelectItem>
                                  <SelectItem value="casa">Casa</SelectItem>
                                  <SelectItem value="casa_condominio">Casa em Condomínio</SelectItem>
                                  <SelectItem value="terreno">Terreno</SelectItem>
                                  <SelectItem value="comercial">Comercial</SelectItem>
                                  <SelectItem value="rural">Rural</SelectItem>
                                  <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="finalidade" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Finalidade *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="O que deseja fazer?" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="vender">Vender</SelectItem>
                                  <SelectItem value="alugar">Alugar</SelectItem>
                                  <SelectItem value="ambos">Vender ou Alugar</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Localização */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          Localização
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="cep" render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="00000-000"
                                    maxLength={9}
                                    value={field.value}
                                    onChange={(e) => handleCepChange(e.target.value)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                  {isLoadingCep && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="endereco" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Endereço *</FormLabel>
                              <FormControl><Input placeholder="Rua, número" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="bairro" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro *</FormLabel>
                              <FormControl><Input placeholder="Bairro" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="cidade" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade *</FormLabel>
                              <FormControl><Input placeholder="Cidade" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Características */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Home className="h-5 w-5 text-primary" />
                          Características (opcional)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <FormField control={form.control} name="areaTotal" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1"><Ruler className="h-4 w-4" /> Área Total</FormLabel>
                              <FormControl><Input type="number" placeholder="m²" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="areaConstruida" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1"><Ruler className="h-4 w-4" /> Área Constr.</FormLabel>
                              <FormControl><Input type="number" placeholder="m²" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="quartos" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> Quartos</FormLabel>
                              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="banheiros" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1"><Bath className="h-4 w-4" /> Banheiros</FormLabel>
                              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="vagas" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1"><Car className="h-4 w-4" /> Vagas</FormLabel>
                              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>

                      {/* Observações */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Observações (opcional)
                        </h3>
                        <FormField control={form.control} name="descricao" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Informações adicionais sobre o imóvel</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descreva características especiais, reformas recentes, diferenciais do imóvel..." 
                                className="min-h-[120px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* Submit Buttons */}
                      <div className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Button 
                            type="submit" 
                            variant="gold" 
                            size="xl" 
                            className="w-full"
                            disabled={isSubmitting || isEstimating}
                          >
                            {isSubmitting ? 'Enviando...' : 'Solicitar Avaliação Gratuita'}
                          </Button>
                          <Button 
                            type="button"
                            size="xl"
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                            disabled={isSubmitting || isEstimating}
                            onClick={handleEstimarIA}
                          >
                            {isEstimating ? (
                              <span className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 animate-spin" />
                                Analisando...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Estimar Valor com IA
                              </span>
                            )}
                          </Button>
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                          Seus dados serão enviados diretamente para nossa equipe
                        </p>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* AI Estimation Result */}
            {estimativa && (
              <div ref={resultRef} className="mt-8">
                <ScrollReveal>
                  <Card className="border-primary/30 shadow-xl bg-gradient-to-br from-background to-secondary/30">
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <BarChart3 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl md:text-2xl font-display">
                              Estimativa de Valor
                            </CardTitle>
                            <CardDescription>Baseada em {estimativa.imoveisComparados} imóveis comparáveis</CardDescription>
                          </div>
                        </div>
                        <Badge className={confiancaConfig[estimativa.confianca].className}>
                          {confiancaConfig[estimativa.confianca].label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Value Range */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 rounded-lg bg-background border border-border">
                          <p className="text-sm text-muted-foreground mb-1">Valor Mínimo</p>
                          <p className="text-xl md:text-2xl font-bold text-foreground">{formatCurrency(estimativa.valorEstimadoMin)}</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-primary/5 border-2 border-primary/30">
                          <p className="text-sm text-primary font-medium mb-1 flex items-center justify-center gap-1">
                            <TrendingUp className="h-4 w-4" /> Faixa Estimada
                          </p>
                          <p className="text-lg md:text-xl font-bold text-primary">
                            {formatCurrency(estimativa.valorEstimadoMin)} - {formatCurrency(estimativa.valorEstimadoMax)}
                          </p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-background border border-border">
                          <p className="text-sm text-muted-foreground mb-1">Valor Máximo</p>
                          <p className="text-xl md:text-2xl font-bold text-foreground">{formatCurrency(estimativa.valorEstimadoMax)}</p>
                        </div>
                      </div>

                      {/* M2 Value */}
                      <div className="text-center p-4 rounded-lg bg-background border border-border">
                        <p className="text-sm text-muted-foreground mb-1">Valor Médio do m² na Região</p>
                        <p className="text-xl font-bold text-foreground">{formatCurrency(estimativa.valorM2Medio)}/m²</p>
                      </div>

                      {/* Analysis */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Análise da IA
                        </h4>
                        <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                          {estimativa.analise}
                        </div>
                      </div>

                      {/* Disclaimer */}
                      <div className="flex items-start gap-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          Esta é uma estimativa automatizada baseada em imóveis similares disponíveis em nosso catálogo. 
                          Para uma avaliação precisa, nossa equipe de especialistas entrará em contato com você.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
