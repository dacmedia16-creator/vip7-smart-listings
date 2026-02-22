

## Aumentar limite de busca de imoveis comparaveis

### O que muda

Aumentar o `MAX_PAGES` de 5 para 15 na edge function `avaliacao-ia`, permitindo buscar ate 300 imoveis comparaveis em vez de apenas 100.

### Consideracoes

- Cada pagina adicional e uma chamada extra a API Imoview, o que aumenta o tempo de resposta
- Na pratica, para cidades menores, a API vai retornar menos de 20 resultados antes de chegar na pagina 15, e o loop para automaticamente
- Para cidades grandes com muitos imoveis, ter mais comparaveis melhora a precisao da estimativa da IA

### Arquivo: `supabase/functions/avaliacao-ia/index.ts`

- Alterar `MAX_PAGES` de 5 para 15 (linha 121)
- Ajustar o slice dos comparaveis selecionados para usar mais dados: de 20+10 para 40+20 (ate 60 comparaveis enviados para a IA)

### Detalhes Tecnicos

- `MAX_PAGES = 15` -> ate 300 imoveis brutos da API
- Apos filtragem por tipo/bairro, selecionar ate 40 do mesmo bairro + 20 de outros bairros (60 total para a IA)
- O loop continua parando automaticamente quando uma pagina retorna menos de 20 resultados
