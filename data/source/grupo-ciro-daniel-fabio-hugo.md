# Grupo de WhatsApp: "Ciro Daniel Fábio Hugo"

## 1. Identificação Geral
- **Nome do grupo**: `Ciro Daniel Fábio Hugo`
- **Criador**: Ciro Nogueira
- **Data de criação**: Abril de 2024
- **Período de mensagens preservadas**: Agosto a novembro de 2025
- **Identificador no VorcaroZap**: `ciro-daniel-fabio-hugo`

---

## 2. Participantes Identificados
1. **Daniel Vorcaro** — Proprietário e controlador do Banco Master.
2. **Ciro Nogueira** — Senador da República (PP-PI), ex-ministro-chefe da Casa Civil e presidente nacional do Progressistas. Criador do grupo.
3. **Fábio Faria** — Ex-ministro das Comunicações do governo federal e ex-deputado federal (RN). Interlocutor próximo de Vorcaro em Brasília.
4. **Hugo Motta** — Deputado Federal (Republicanos-PB) e presidente da Câmara dos Deputados.

---

## 3. Fontes Documentais e Jornalísticas
- **UOL (Cezar Feitoza, 30/09/2026)**:
  *Título*: *"Grupo de zap para organizar encontros reunia Vorcaro, Ciro, Motta e Faria"*
  *URL*: `https://noticias.uol.com.br/colunas/cezar-feitoza/2026/09/30/grupo-de-zap-para-organizar-encontros-reunia-vorcaro-ciro-motta-e-faria.ghtm`
- **Correio da Manhã (30/09/2026)**:
  *Título*: *"Grupo de WhatsApp reunia Vorcaro, Ciro Nogueira, Hugo Motta e Fábio Faria"*
  *URL*: `https://www.cm.com.br/politica/2026/09/323289-grupo-de-whatsapp-reunia-vorcaro-ciro-nogueira-hugo-motta-e-fabio-faria.html`

---

## 4. Contexto dos Diálogos Apurados
Segundo as reportagens, o grupo era utilizado pelo quarteto para:
- Coordenar jantares e encontros presenciais em Brasília (com frequência na residência de Daniel Vorcaro no Lago Sul);
- Tratar de articulações políticas e institucionais no Congresso Nacional;
- Discutir cenários do mercado financeiro e temas de interesse mútuo.

A perícia da Polícia Federal apreendeu o aparelho de Vorcaro e identificou a cadeia de custódia das mensagens entre agosto e novembro de 2025.

---

## 5. Instruções para Atualização Posterior com as Mensagens Reais
Assim que novas transcrições judiciais ou laudos periciais da Polícia Federal com a íntegra das mensagens forem tornados públicos:
1. Abra o arquivo `data/conversations/ciro-daniel-fabio-hugo.json`.
2. Insira as mensagens oficiais no array `"messages"` com os campos:
   - `id`: identificador numérico sequencial (1, 2, 3...);
   - `timestamp`: formato ISO `YYYY-MM-DDTHH:MM:SS`;
   - `date`: `YYYY-MM-DD`;
   - `time`: `HH:MM:SS`;
   - `sender`: `"DV"`, `"Ciro Nogueira"`, `"Fábio Faria"`, `"Hugo Motta"` ou `"System"`;
   - `content`: texto exato da mensagem transcrita;
   - `type`: `"text"`, `"audio"`, `"image"`, `"system"`, etc.;
   - `source_page` / `source_figure`: se constar em laudo com páginas.
3. Atualize o array `"index"."dates"` com o agrupamento por dia correspondente.
4. Execute `py scripts/split_data.py && npm run build` para regerar os chunks de dados e arquivos de exportação.
