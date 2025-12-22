import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AvaliacaoRequest {
  nome: string;
  email: string;
  telefone: string;
  tipoImovel: string;
  finalidade: string;
  cep?: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  areaTotal?: string;
  areaConstruida?: string;
  quartos?: string;
  banheiros?: string;
  vagas?: string;
  observacoes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to send-avaliacao-email");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: AvaliacaoRequest = await req.json();
    console.log("Processing avaliacao request for:", data.nome);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; border-bottom: 2px solid #c9a55c; padding-bottom: 10px;">
          Nova Solicitação de Avaliação de Imóvel
        </h1>
        
        <h2 style="color: #333; margin-top: 30px;">Dados do Proprietário</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Nome:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.nome}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.email}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Telefone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.telefone}</td></tr>
        </table>

        <h2 style="color: #333; margin-top: 30px;">Dados do Imóvel</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Tipo:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.tipoImovel}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Finalidade:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.finalidade}</td></tr>
        </table>

        <h2 style="color: #333; margin-top: 30px;">Localização</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Endereço:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.endereco}${data.numero ? `, ${data.numero}` : ''}${data.complemento ? ` - ${data.complemento}` : ''}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Bairro:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.bairro}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Cidade:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.cidade}</td></tr>
          ${data.cep ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>CEP:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.cep}</td></tr>` : ''}
        </table>

        <h2 style="color: #333; margin-top: 30px;">Características</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${data.areaTotal ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Área Total:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.areaTotal} m²</td></tr>` : ''}
          ${data.areaConstruida ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Área Construída:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.areaConstruida} m²</td></tr>` : ''}
          ${data.quartos ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Quartos:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.quartos}</td></tr>` : ''}
          ${data.banheiros ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Banheiros:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.banheiros}</td></tr>` : ''}
          ${data.vagas ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Vagas:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.vagas}</td></tr>` : ''}
        </table>

        ${data.observacoes ? `
        <h2 style="color: #333; margin-top: 30px;">Observações</h2>
        <p style="background: #f9f9f9; padding: 15px; border-radius: 5px;">${data.observacoes}</p>
        ` : ''}

        <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          Este email foi enviado automaticamente pelo sistema VIP7 Imóveis.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "VIP7 Imóveis <onboarding@resend.dev>",
        to: ["denissouza@vip7imoveis.com.br"],
        subject: `Nova Avaliação de Imóvel - ${data.nome}`,
        html: emailHtml,
      }),
    });

    const emailResponse = await res.json();
    
    if (!res.ok) {
      console.error("Error sending email:", emailResponse);
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-avaliacao-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
