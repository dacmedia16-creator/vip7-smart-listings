import { useState } from 'react';
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
  Phone, 
  Mail, 
  User, 
  CheckCircle2,
  Building,
  FileText
} from 'lucide-react';

const avaliacaoSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório').max(100),
  email: z.string().email('Email inválido').max(255),
  telefone: z.string().min(10, 'Telefone inválido').max(20),
  tipoImovel: z.string().min(1, 'Selecione o tipo de imóvel'),
  finalidade: z.string().min(1, 'Selecione a finalidade'),
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

const beneficios = [
  { icon: CheckCircle2, text: 'Avaliação profissional e gratuita' },
  { icon: CheckCircle2, text: 'Análise de mercado completa' },
  { icon: CheckCircle2, text: 'Resposta em até 24 horas' },
  { icon: CheckCircle2, text: 'Sem compromisso' },
];

export default function Avaliacao() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<AvaliacaoFormData>({
    resolver: zodResolver(avaliacaoSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      tipoImovel: '',
      finalidade: '',
      endereco: '',
      bairro: '',
      cidade: '',
      areaTotal: '',
      areaConstruida: '',
      quartos: '',
      banheiros: '',
      vagas: '',
      descricao: '',
    },
  });

  const onSubmit = async (data: AvaliacaoFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-avaliacao-email', {
        body: {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          tipoImovel: data.tipoImovel,
          finalidade: data.finalidade,
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

      if (error) {
        throw error;
      }

      toast({
        title: 'Solicitação enviada com sucesso!',
        description: 'Entraremos em contato em até 24 horas.',
      });

      form.reset();
    } catch (error: any) {
      console.error('Error sending avaliacao:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Tente novamente ou entre em contato pelo WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
                AVALIAÇÃO GRATUITA
              </span>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
                Descubra o Valor Real do{' '}
                <span className="text-primary">Seu Imóvel</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Receba uma avaliação profissional e gratuita do seu imóvel. 
                Nossa equipe de especialistas irá analisar as características 
                e o mercado para definir o melhor valor.
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
                          <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Completo *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu nome" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="seu@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="telefone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone *</FormLabel>
                                <FormControl>
                                  <Input placeholder="(11) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Tipo e Finalidade */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Building className="h-5 w-5 text-primary" />
                          Tipo do Imóvel
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="tipoImovel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de Imóvel *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
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
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="finalidade"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Finalidade *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="O que deseja fazer?" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="vender">Vender</SelectItem>
                                    <SelectItem value="alugar">Alugar</SelectItem>
                                    <SelectItem value="ambos">Vender ou Alugar</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Localização */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          Localização
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="endereco"
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel>Endereço *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Rua, número" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bairro"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bairro *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Bairro" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="cidade"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cidade *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Cidade" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Características */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Home className="h-5 w-5 text-primary" />
                          Características (opcional)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <FormField
                            control={form.control}
                            name="areaTotal"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1">
                                  <Ruler className="h-4 w-4" /> Área Total
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="m²" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="areaConstruida"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1">
                                  <Ruler className="h-4 w-4" /> Área Constr.
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="m²" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="quartos"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1">
                                  <BedDouble className="h-4 w-4" /> Quartos
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="banheiros"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1">
                                  <Bath className="h-4 w-4" /> Banheiros
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="vagas"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1">
                                  <Car className="h-4 w-4" /> Vagas
                                </FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Observações */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Observações (opcional)
                        </h3>
                        <FormField
                          control={form.control}
                          name="descricao"
                          render={({ field }) => (
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
                          )}
                        />
                      </div>

                      {/* Submit */}
                      <div className="pt-4">
                        <Button 
                          type="submit" 
                          variant="gold" 
                          size="xl" 
                          className="w-full"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Enviando...' : 'Solicitar Avaliação Gratuita'}
                        </Button>
                        <p className="text-center text-sm text-muted-foreground mt-4">
                          Seus dados serão enviados diretamente para nossa equipe
                        </p>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </Layout>
  );
}
