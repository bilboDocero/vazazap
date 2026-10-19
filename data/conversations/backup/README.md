# Conversas em standby

Revisão de fontes em **19/10/2026**. Os nove arquivos continham textos de
preenchimento sem referência individual. Eles foram substituídos por **28 recortes
publicados**, com atribuição e referência por registro. Telefones, apelidos de
agenda e horários sem comprovação foram removidos.

Este diretório continua em standby. `scripts/split_data.py` lê apenas os JSONs
diretamente em `data/conversations/`, sem percorrer subdiretórios. Portanto, estes
arquivos não entram nos chats, na busca, nos exports ou nas páginas geradas.
O recurso de **Arquivadas** do aplicativo é um filtro de conversas já publicadas
e não corresponde a esta pasta.

## Cobertura e fontes

| Arquivo | Recortes | Conteúdo selecionado | Publicação consultada |
| --- | ---: | --- | --- |
| [flavio-bolsonaro.json](flavio-bolsonaro.json) | 3 | Dark Horse e mensagem de apoio | [Intercept Brasil, 13/05/2026](https://www.intercept.com.br/2026/05/13/audio-flavio-negociou-vorcaro-milhoes/) |
| [frederic-kachar.json](frederic-kachar.json) | 4 | Divulgação, contrato de publicidade e propostas | [UOL, 15/10/2026](https://www.bol.uol.com.br/noticias/2026/10/15/grupo-globo-demite-diretor-geral-apos-vazamento-de-conversas-com-vorcaro.htm) |
| [hugo-motta.json](hugo-motta.json) | 3 | Carnaval e Mônaco | [Folha, 29/09/2026](https://www1.folha.uol.com.br/poder/2026/09/mensagens-indicam-proximidade-entre-vorcaro-e-motta-queria-estar-mesmo-era-em-monaco-com-voce.shtml) |
| [iraja-abreu.json](iraja-abreu.json) | 4 | Recados e convite de viagem | [UOL, 30/09/2026](https://noticias.uol.com.br/politica/ultimas-noticias/2026/09/30/mensagens-senador-do-psd-to-para-vorcaro.amp.htm) |
| [joao-doria.json](joao-doria.json) | 2 | Alerta sobre rumores | [Folha, 05/03/2026](https://www1.folha.uol.com.br/amp/mercado/2026/03/doria-aconselhou-vorcaro-a-reagir-a-rumores-antes-de-investigacao-do-master-mostram-mensagens.shtml) |
| [luciano-huck.json](luciano-huck.json) | 1 | Pedido de uso de aeronave | [Poder360, 30/09/2026](https://www.poder360.com.br/poder-gente/leia-as-mensagens-entre-luciano-huck-e-daniel-vorcaro/) |
| [luiz-phillipi-mourao.json](luiz-phillipi-mourao.json) | 5 | Recortes citados em decisão cautelar | [PET 15.556, decisão de 03/03/2026, p. 13](https://causosecausas.com/wp-content/uploads/2026/03/decisao-Op.-Compliance-Zero.pdf) |
| [nikolas-ferreira.json](nikolas-ferreira.json) | 3 | Demanda do advogado e respostas de Vorcaro | [UOL, 03/09/2026](https://www.bol.uol.com.br/noticias/2026/09/03/nikolas-ferreira-audio-daniel-vorcaro.ghtm) |
| [yasmin-brunet.json](yasmin-brunet.json) | 3 | Conversa sobre transporte no fim de 2023 | [VEJA, 02/10/2026](https://veja.abril.com.br/brasil/mensagens-da-pf-revelam-amizade-cheia-de-aventuras-de-vorcaro-com-yasmin-brunet/) |

São citações curtas e parciais, sem reconstruir respostas ou preencher intervalos.
A grafia segue o texto publicado; não foi uniformizada como se tivesse sido
conferida contra um export original. Mesmo um trecho que pareça uma mensagem
completa permanece marcado como recorte. Registros consecutivos no JSON podem
ter mensagens omitidas entre eles. Os IDs são locais a esta seleção e substituem
os IDs do preenchimento anterior.

## Formato de pesquisa (versão 2)

- `metadata.status: "standby"` e `publication_ready: false`: não pronto para
  importação direta no visualizador.
- `metadata.sources`: publicação, URL, data de publicação quando conhecida e
  data da consulta. A decisão judicial tem `document_date` separado e
  `published_at: null`; a data da decisão não foi tratada como data de divulgação.
- `source_id` e `source_locator`: apontam a publicação e a passagem que sustenta
  cada recorte. A fonte da decisão é uma cópia hospedada por terceiro, identificada
  como `court_decision_mirror`, com o código de autenticação indicado no PDF.
  A assinatura digital não foi validada nesta atualização.
- `excerpt: true`: conteúdo parcial de uma mensagem ou de uma transcrição de
  áudio. O tipo original foi preservado quando explicitamente informado.
- `reported_date`: data que a fonte permite estabelecer, com precisão de dia
  (`AAAA-MM-DD`), mês (`AAAA-MM`), ano (`AAAA`) ou `null`.
- `date`: preenchido apenas quando há um dia identificável. A última resposta a
  Nikolas usa `date_basis: "relative_sequence_in_report"`: o dia é derivado da
  sequência descrita pelo UOL, não de um carimbo original.
- `timestamp` e `time`: `null` quando o horário não está documentado; não se usa
  meia-noite para simular um horário. `is_edited: null` expressa desconhecimento.
- `index.dates`: somente os dias completos conhecidos. Registros sem dia exato
  ficam em `index.undated_message_ids`, sem descarte.
- `date_range`: intervalo dos recortes com dia conhecido, não de toda a conversa.
  `date_range_complete` informa se todos os recortes têm um dia identificável.
  Com dias desconhecidos, a ordem dos recortes segue sua apresentação na fonte,
  sem pretender uma cronologia completa.
- `context` e `limitations`: contexto editorial e lacunas, separados da fala dos
  participantes. Notas e respostas dos envolvidos não viram mensagens de chat.

Conferir uma publicação não equivale a autenticar forensicamente o aparelho ou
a concluir que houve um ilícito. Referências indiretas na conversa de Martha não
foram transferidas para chats diretos. Hipóteses de redes sociais também não foram
convertidas em transcrições.

## Publicação futura

Os nove arquivos têm cópias publicadas no diretório superior, com
`metadata.status: "published"` e `publication_ready: true`. O visualizador,
gerador, pesquisa e exports agora suportam datas parciais e horários desconhecidos
e exibem as fontes. Os originais desta pasta permanecem em standby.

O gerador ignora subdiretórios e também ignora arquivos do diretório superior
marcados com `publication_ready: false`. Para publicar revisões, atualize a cópia
do diretório superior e execute `npm run build`; para apenas regenerar os dados
locais, use `npm run split-data`. Fontes com documentos ou carimbos adicionais
permitem ampliar esta seleção sem inventar metadados.

Validação: `npx vitest run tests/unit/standby-conversations.test.js`.

## Nota sobre a ampliação das cópias publicadas

Os arquivos desta pasta preservam a seleção anterior. As cópias na pasta acima receberam resumos editoriais e contexto adicional de mensagens publicadas, mantendo os IDs e os trechos literais originais. Um horário antes desconhecido foi confirmado em captura. Consulte [a revisão de fontes](../PUBLIC-SOURCES.md) para os totais atuais e as lacunas restantes.
