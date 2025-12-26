import { useState } from 'react';
import { useImovelDetalhes } from '@/hooks/useImoveis';
import { buildOgShareUrl } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink, MessageCircle, Facebook, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOgTester() {
  const [codigo, setCodigo] = useState('');
  const [testedCodigo, setTestedCodigo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: imovel, isLoading, error } = useImovelDetalhes(testedCodigo || undefined);

  const handleTest = () => {
    if (codigo.trim()) {
      setTestedCodigo(codigo.trim());
    }
  };

  const ogUrl = testedCodigo ? buildOgShareUrl(testedCodigo) : '';
  
  const mainPhoto = imovel?.fotos?.[0]?.url || '';
  const title = imovel?.titulo || `Imóvel ${testedCodigo}`;
  const description = imovel?.descricao || '';

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(ogUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const openOgLink = () => {
    window.open(ogUrl, '_blank');
  };

  const openFacebookDebugger = () => {
    window.open(`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(ogUrl)}`, '_blank');
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(ogUrl)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">OG Metadata Tester</h1>
        <p className="text-muted-foreground">
          Teste os links de compartilhamento com Open Graph tags para WhatsApp, Facebook, etc.
        </p>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Código do Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Input
              type="text"
              placeholder="Ex: 1038"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              className="max-w-[200px]"
            />
            <Button onClick={handleTest} disabled={!codigo.trim()}>
              Testar
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {testedCodigo && (
          <>
            {isLoading && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Carregando dados do imóvel...
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive">
                <CardContent className="py-8 text-center text-destructive">
                  Erro ao carregar imóvel: {(error as Error).message}
                </CardContent>
              </Card>
            )}

            {imovel && (
              <>
                {/* OG Link */}
                <Card>
                  <CardHeader>
                    <CardTitle>Link OG Gerado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <code className="block p-3 bg-muted rounded text-sm break-all">
                      {ogUrl}
                    </code>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={openOgLink}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir Link
                      </Button>
                      <Button variant="outline" size="sm" onClick={openFacebookDebugger}>
                        <Facebook className="w-4 h-4 mr-2" />
                        Facebook Debugger
                      </Button>
                      <Button variant="outline" size="sm" onClick={openWhatsApp}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Testar WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Preview dos Meta Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">og:title</span>
                        <p className="text-foreground">{title}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">og:description</span>
                        <p className="text-foreground line-clamp-3">
                          {description.substring(0, 200)}{description.length > 200 ? '...' : ''}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">og:url (canonical)</span>
                        <p className="text-foreground">{`${window.location.origin}/#/imovel/${testedCodigo}`}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Image Preview */}
                {mainPhoto && (
                  <Card>
                    <CardHeader>
                      <CardTitle>og:image</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Recomendado: 1200x630px para melhor exibição
                      </p>
                      <div className="border rounded overflow-hidden max-w-xl">
                        <img 
                          src={mainPhoto} 
                          alt="OG Preview" 
                          className="w-full h-auto object-cover"
                        />
                      </div>
                      <code className="block p-2 bg-muted rounded text-xs break-all">
                        {mainPhoto}
                      </code>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
