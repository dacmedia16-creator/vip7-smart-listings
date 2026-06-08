# Conformidade VRSync (Zap / VivaReal / OLX)

Os três portais do Grupo OLX (OLX, Zap, VivaReal) usam **um único formato: VRSync**. Outros formatos foram descontinuados em out/2024. Vou consolidar e corrigir o feed para passar no validador oficial do Grupo OLX.

## Mudanças

### 1. Consolidar feeds OLX e Zap em um só

- Atualmente: `/portal-feed/zap` e `/portal-feed/olx` geram XMLs diferentes.
- Novo: ambas as rotas geram o mesmo VRSync. A diferença fica apenas no filtro de quais imóveis incluir (você ainda pode marcar "publicar no Zap" e "publicar na OLX" separado no CRM — útil porque o plano contratado pode ser diferente em cada um).
- ImovelWeb e Chaves na Mão continuam com formatos próprios.

### 2. Reescrever `buildVRSync` conforme o spec

Estrutura corrigida (resumo dos pontos que mudam):

```xml
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">
  <Header>
    <Provider>VIP7 Imoveis</Provider>
    <Email>contato@vipsevenimoveis.com.br</Email>
    <ContactName>VIP7 Imoveis</ContactName>
    <PublishDate>2026-06-08T...</PublishDate>
    <Telephone>15 3500-8641</Telephone>
  </Header>
  <Listings>
    <Listing>
      <ListingID>...</ListingID>
      <Title>...</Title>
      <TransactionType>For Sale | For Rent</TransactionType>
      <PublicationType>STANDARD | PREMIUM | SUPER_PREMIUM</PublicationType>
      <DetailViewUrl>https://vipsevenimoveis.com.br/imovel/{codigo}</DetailViewUrl>
      <Media>
        <Item medium="video">{youtube_url}</Item>
        <Item medium="image" primary="true">URL_FOTO_1</Item>
        <Item medium="image">URL_FOTO_2</Item>
      </Media>
      <Details>
        <UsageType>Residential | Commercial</UsageType>
        <PropertyType>Residential / Apartment</PropertyType>
        <Description><![CDATA[...]]></Description>
        <ListPrice currency="BRL">860000</ListPrice>
        <PropertyAdministrationFee currency="BRL">980</PropertyAdministrationFee>
        <Iptu currency="BRL" period="Yearly">4500</Iptu>
        <LivingArea unit="square metres">80</LivingArea>
        <LotArea unit="square metres">90</LotArea>
        <Bedrooms>2</Bedrooms>
        <Bathrooms>1</Bathrooms>
        <Suites>1</Suites>
        <Garage type="Parking Space">2</Garage>
        <Features>
          <Feature>Pool</Feature>
          ...
        </Features>
      </Details>
      <Location displayAddress="Street | Neighborhood | City | None">
        <Country abbreviation="BR">Brasil</Country>
        <State abbreviation="SP">São Paulo</State>
        <City>Sorocaba</City>
        <Neighborhood>Centro</Neighborhood>
        <Address>Rua X</Address>
        <StreetNumber>123</StreetNumber>
        <PostalCode>...</PostalCode>
        <Latitude>...</Latitude>
        <Longitude>...</Longitude>
      </Location>
      <ContactInfo>
        <Name>VIP7 Imoveis</Name>
        <Email>contato@vipsevenimoveis.com.br</Email>
        <Telephone>15 3500-8641</Telephone>
        <Website>https://vipsevenimoveis.com.br</Website>
      </ContactInfo>
    </Listing>
  </Listings>
</ListingDataFeed>
```

### 3. Tabelas de mapeamento (em `supabase/functions/portal-feed/vrsync-maps.ts`)

- `mapPropertyType(tipoDb)` → casa→`Residential / Home`, apartamento→`Residential / Apartment`, terreno→`Allotment Land`, sala/comercial→`Commercial / Business`, galpão→`Commercial / Warehouse`, etc.
- `mapUsageType(tipoDb)` → comercial/sala/galpão→`Commercial`, resto→`Residential`.
- `mapFeature(caracteristicaPt)` → tabela PT→EN com ~60 entradas (Piscina→Pool, Academia→Gym, Churrasqueira→BBQ, Elevador→Elevator, Varanda→Balcony, Mobiliado→Furnished, Portaria 24h→Security Guard on Duty, etc.). Características sem match são descartadas (não invalida o imóvel).
- `mapDisplayAddress(mostrar_endereco, endereco, numero)` → `Street` se mostra tudo, `Neighborhood` caso contrário, `None` se sem bairro.

### 4. Dados da imobiliária centralizados

Constante no topo da edge function: nome, email, telefone, site, endereço (Sorocaba). Lê de `app_config` se existir chave `imobiliaria_contato_json`, senão usa padrão.

### 5. Página `/crm/portais` — pequenos ajustes

- Card do Zap passa a dizer "Zap + VivaReal + OLX (Grupo OLX)" para deixar claro.
- Mostra 1 URL única para os 3 (mas mantém colunas separadas na tabela porque você pode ter contratos diferentes por portal e querer escolher quem vai pra cada um).
- Tooltip explicando que o XML é o mesmo, mas o portal só lê imóveis marcados especificamente para ele.

### 6. Validação reforçada

Adicionar ao `validarImovelParaPortais`:
- Título 10–100 chars (spec do Zap)
- Descrição 100–3000 chars (Zap rejeita acima)
- Pelo menos 5 fotos é recomendado (mas só 1 é obrigatório — manter como warning, não bloqueio).

## Fora deste plano

- Suporte a Aluguel Digital, leads via webhook do Zap, ou Lead Manager API (são integrações separadas no portal Grupo OLX e exigem credenciais B2B).
- Validador local do XML — usuário pode subir o arquivo no [validador oficial](https://developers.grupozap.com/feeds/xml_validator/) baixando do nosso endpoint.

## Arquivos a alterar

- `supabase/functions/portal-feed/index.ts` — reescrever `buildVRSync`, importar mapas.
- `supabase/functions/portal-feed/vrsync-maps.ts` — novo, com mapeamentos PT→EN.
- `src/crm/lib/portais.ts` — atualizar labels (Zap card) e endurecer validador.
- `src/crm/pages/Portais.tsx` — texto do card Zap.
