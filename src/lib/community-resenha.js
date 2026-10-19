/** Original fictional reactions. Real references are kept separate from the jokes. */
const people = [
  { name: 'Bia do Café', color: '#008069' },
  { name: 'Nando dos Prints', color: '#0063CB' },
  { name: 'Lari da Resenha', color: '#8257A6' },
  { name: 'Tati do Busão', color: '#9F6840' },
  { name: 'Zé da Timeline', color: '#1B8755' },
  { name: 'Cris do Fone', color: '#606263' },
];

const references = {
  memeColacao: {
    text: '“Colação” é uma forma carinhosa de escrever “coração” presente nas conversas com Martha Graeff. O meme leva esse vocabulário para situações inventadas, como café, alarme e currículo.',
    links: [{ label: 'Ver o uso de “colação” no acervo', url: '#/chat/martha-graeff/msg/10975' }],
  },
  memePeleleca: {
    text: '“Peleleca” aparece como apelido em uma mensagem do acervo. A resenha imagina o estranhamento de levar essa palavra para o ambiente de trabalho, uma senha ou um dicionário.',
    links: [{ label: 'Ver a referência a “peleleca” no acervo', url: '#/chat/martha-graeff/msg/13984' }],
  },
  memePalaa: {
    text: 'A escrita exagerada “PALAAAAAAA AGOLAAAA” aparece na conversa com Martha. A piada transforma essa reação em nome de ferramenta corporativa, aproveitando a sonoridade e o exagero.',
    links: [{ label: 'Ver a expressão original no acervo', url: '#/chat/martha-graeff/msg/13985' }],
  },
  memeSaldo: {
    text: 'Humor negro sobre o salário durar pouco: o saldo vira um personagem que nasce no dia do pagamento e desaparece nos débitos. Visita hospitalar e herança são metáforas criadas para a resenha.',
    links: [],
  },
  memeLeitura: {
    text: 'A brincadeira é com o hábito de abrir uma conversa por curiosidade e continuar lendo por muito mais tempo que o planejado. Café frio, várias abas e comparação com uma série fazem parte dessa cena fictícia.',
    links: [],
  },
  memePlanilha: {
    text: 'A planilha de orçamento ganha a linguagem de um obituário. O contraste entre uma ferramenta de organização e o desespero com os gastos é o humor negro do cartão.',
    links: [],
  },
  memeFatura: {
    text: 'O meme explora o duplo sentido de “vencer” uma conta e exagera a sensação de susto ao receber a fatura. A cena, os personagens e as dificuldades financeiras são inventados.',
    links: [],
  },
  memeCamarote: {
    text: 'O camarote imaginário troca sinais de luxo por pequenas comodidades do cotidiano: tomada, cadeira e água da torneira. A herança em boletos é uma provocação sobre a distância entre glamour e orçamento apertado.',
    links: [],
  },
  memeApelidos: {
    text: 'A graça está em tentar traduzir apelidos e expressões de uma conversa privada para quem chega de fora. O personagem compara essa dificuldade com as piadas internas do próprio grupo imaginário.',
    links: [],
  },
  dani: {
    text: 'A CNN noticiou em 03/09/2026 um áudio de março de 2025 enviado por Nikolas Ferreira a Vorcaro. O parlamentar confirmou a autenticidade à emissora. A cobertura registra o uso de “Dani”. As reações desta comunidade são inventadas.',
    links: [{ label: 'Ler a cobertura da CNN Brasil', url: 'https://www.cnnbrasil.com.br/politica/em-audio-nikolas-diz-a-vorcaro-se-arrepender-de-critica-a-evento-do-master/' }],
  },
  lindao: {
    text: '“Lindão” circulou na repercussão do áudio. O UOL noticiou em 06/09/2026 uma liminar determinando a remoção de publicações: o juiz entendeu que Nikolas disse “Dani”. Aqui, a piada trata da disputa sobre a escuta; não é uma transcrição nem a confirmação daquela atribuição.',
    links: [{ label: 'Entender a correção noticiada pelo UOL', url: 'https://noticias.uol.com.br/eleicoes/2026/09/06/justica-eleitoral-manda-remover-reportagem-sobre-audio-de-nikolas-e-vorcaro.amp.htm' }],
  },
  huck: {
    text: 'Em mensagem de 28/10/2024 no acervo, Vorcaro diz a Martha que está indo jantar com Luciano Huck. A referência é ao relato do remetente, sem atribuir ao apresentador participação em irregularidades.',
    links: [{ label: 'Ver a mensagem no acervo', url: '#/chat/martha-graeff/msg/31201' }],
  },
  anitta: {
    text: 'Em mensagem de 09/07/2024, Vorcaro diz a Martha que Anitta viria com o irmão para uma reunião rápida. O registro documenta o relato de Vorcaro; não confirma, de forma independente, a realização do encontro.',
    links: [{ label: 'Ver a mensagem no acervo', url: '#/chat/martha-graeff/msg/11386' }],
  },
  miami: {
    text: 'Miami é uma das cidades mencionadas nas conversas. Em 15/02/2024, Martha pergunta se Vorcaro ainda está lá. As comparações com viagens, boletos e transporte nesta resenha são ficção humorística.',
    links: [{ label: 'Ver a referência a Miami no acervo', url: '#/chat/martha-graeff/msg/206' }],
  },
  londres: {
    text: 'A reportagem da CNN de 03/09/2026 descreve um áudio em que Nikolas comenta uma crítica anterior a um evento patrocinado pelo Master em Londres, em 2024. As piadas sobre convites e etiqueta foram criadas para esta comunidade.',
    links: [{ label: 'Ler o contexto na CNN Brasil', url: 'https://www.cnnbrasil.com.br/politica/em-audio-nikolas-diz-a-vorcaro-se-arrepender-de-critica-a-evento-do-master/' }],
  },
  yasminFantasma: {
    text: 'Em 02/10/2026, reportagens registraram a volta de um vídeo do BBB 24 em que Yasmin Brunet menciona um “fantasma”, apelido de alguém de fora da casa. Internautas associaram o apelido a Vorcaro, mas a identidade não foi confirmada por Yasmin nem demonstrada pelas mensagens citadas na cobertura. Os memes brincam com essa teoria da internet.',
    links: [{ label: 'Ler sobre a teoria e seus limites', url: 'https://www.diariodocentrodomundo.com.br/web-aponta-vorcaro-como-fantasma-de-yasmin-brunet-no-bbb-24-entenda/' }],
  },
};

function meme(title, punchline, theme = 'green') {
  return { title, punchline, theme };
}

function reaction(id, speaker, text, { card, reference, minute = 0 } = {}) {
  const person = people[speaker % people.length];
  return {
    id,
    sender: person.name,
    senderColor: person.color,
    text,
    label: 'Reação fictícia',
    fictional: true,
    meme: card,
    context: reference ? references[reference] : undefined,
    date: 'Resenha simulada',
    time: `${String(10 + Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
  };
}

function group(id, name, messages, { announcement = false } = {}) {
  return {
    id, name, messages,
    isAnnouncement: announcement,
    avatarType: announcement ? 'teal' : 'default',
    snippet: `${messages.at(-1).sender}: ${messages.at(-1).text}`,
    date: 'Resenha simulada',
    isUnread: false,
    unreadCount: 0,
    isMuted: true,
  };
}

export function getResenhaGroups() {
  const memes = [
    [0, 'Vim entender o caso. Saí chamando o café de meu colação. O vocabulário é mais contagioso que corrente de bom-dia 😂', meme('ABRI O ACERVO', 'Fechei a aba.\nO “colação” ficou.'), 'memeColacao'],
    [1, 'Meu corretor automático já desistiu de mim. Digito coração, ele oferece colação e um pedido de férias.', meme('CORRETOR AUTOMÁTICO', 'Deseja adicionar “colação”\nao dicionário?', 'neutral'), 'memeColacao'],
    [2, 'No meu grupo fictício da firma, “peleleca” seria nome de projeto. Ninguém entenderia o escopo, mas a reunião ia acontecer.', meme('PROJETO PELELECA', 'Prazo: ontem.\nEscopo: ninguém sabe.', 'cream'), 'memePeleleca'],
    [3, 'Meu saldo não está baixo. Está em cuidados paliativos e o banco ainda cobra pela visita. PALAAAAAAA AGOLAAAA.', meme('OBITUÁRIO DO SALDO', 'Nasceu no quinto dia útil.\nMorreu no débito automático.'), 'memeSaldo'],
    [4, 'A partir de hoje meu alarme se chama Colação. Vai ser a primeira vez que eu mando meu colação calar a boca às seis da manhã.', undefined, 'memeColacao'],
    [5, 'Abri três abas e um café. Minha fé na humanidade pediu cremação e avisou que não quer flores, só estorno.', meme('NOTA DE FALECIMENTO', 'A fé na humanidade se foi.\nO café também esfriou.', 'neutral'), 'memeLeitura'],
    [0, 'Meu colação continua batendo. Meu planejamento financeiro já foi de arrasta e deixou o cheque especial como herdeiro.', undefined, 'memeSaldo'],
    [1, 'O grupo precisava de uma figurinha escrita “calma, meu colação” para cada pessoa que manda áudio de quatro minutos.', meme('ÁUDIO DE 4 MINUTOS', 'Calma, meu colação.\nEu ainda tô no primeiro.'), 'memeColacao'],
    [2, 'Organizei minha vida na planilha: coluna A, salário; coluna B, gastos; coluna C, causa mortis. O Excel perguntou se eu queria acender uma vela.', meme('PLANILHA FINANCEIRA', 'A: salário\nB: gastos\nC: causa mortis', 'cream'), 'memePlanilha'],
    [3, 'A resenha tá boa, mas eu queria ter a mesma disposição pra ler os termos do meu cartão. Lá eu aceito sem nem piscar.', undefined, 'memeFatura'],
    [4, 'Peleleca parece nome de senha que o site recusaria: falta maiúscula, número e um trauma.', meme('SENHA MUITO FRACA', 'Peleleca123!\nAinda falta um trauma.', 'neutral'), 'memePeleleca'],
    [5, 'O áudio mental dessa leitura já tem trilha, intervalo e reprise. Só falta eu receber pela audiência.', undefined, 'memeLeitura'],
    [0, 'Meu currículo: organizado, proativo, fluente em “colação” e capaz de achar graça com o café frio.', meme('NOVA COMPETÊNCIA', 'Fluente em colação.\nIntermediário em planilha.'), 'memeColacao'],
    [1, 'A fofoca veio com índice. Minha confiança nas pessoas veio com atestado de óbito. Pelo menos o histórico de mensagens sobreviveu.', meme('FOFOCA ORGANIZADA', 'A esperança morreu.\nO histórico ficou.', 'cream'), 'memeLeitura'],
    [2, '“Só mais uma mensagem” é o novo “só mais um episódio”. Já já o navegador pergunta se eu ainda estou assistindo.', undefined, 'memeLeitura'],
    [3, 'Meu camarote VIP é a cadeira perto da tomada. Open bar de água da torneira e uma herança de família: o medo de abrir a fatura.', meme('HERANÇA DA FAMÍLIA', 'Não deixou patrimônio.\nDeixou o nome no boleto.'), 'memeCamarote'],
    [4, 'Eu queria uma função que traduzisse apelido em contexto. Mas aí percebi que nem eu explico os apelidos do meu grupo.', undefined, 'memeApelidos'],
    [5, 'Se eu escrever “PALAAAA” no trabalho, minha chefe vai achar que é o nome de uma ferramenta nova.', meme('NOVA FERRAMENTA', 'PALAAAA Pro\nPlano anual de desespero.', 'neutral'), 'memePalaa'],
    [0, 'Meu colação vendo que o grupo mandou mais vinte mensagens enquanto eu fazia um café: preciso de uma assessoria.', meme('SAÍ PRA PASSAR CAFÉ', 'Voltei com 20 mensagens\ne nenhuma conclusão.'), 'memeColacao'],
    [1, 'Cheguei na resenha querendo entender tudo. Por enquanto, só consigo explicar o apelido do meu gato.', undefined, 'memeApelidos'],
    [2, 'Minha fatura não vence. Ela executa. O Cebolinha imaginário da minha cabeça já está ensaiando o discurso no velório do meu salário.', meme('MINHA FATURA', 'Ela não vence.\nEla executa.', 'cream'), 'memeFatura'],
    [3, 'Aviso da minha cozinha: o café acabou, o biscoito acabou, a vontade de comentar aparentemente é renovável.', undefined, 'memeLeitura'],
    [4, 'Resumo do meu dia: trabalhei, peguei ônibus e consultei um dicionário que não tinha a palavra peleleca.', meme('DICIONÁRIO ATUALIZADO', 'Colação: substantivo.\nPeleleca: assunto do grupo.', 'neutral'), 'memePeleleca'],
    [5, 'Vou sair por cinco minutos. Se a resenha ganhar segunda temporada, deixem meu lugar perto da tomada.', undefined, 'memeLeitura'],
    [0, 'Depois dessa resenha do fantasma, abri o aplicativo do banco e perguntei: salário, se você está entre nós, dê um sinal. O aplicativo pediu para tentar novamente mais tarde.', meme('SESSÃO ESPÍRITA DO SALDO', 'Salário, você está entre nós?\nErro: entidade não encontrada.', 'neutral'), 'yasminFantasma'],
    [4, 'Meu fantasma não apaga a luz nem arrasta corrente. Ele acende a tela às três da manhã com a notificação da fatura. Terror nacional, sem incentivo fiscal.', meme('ATIVIDADE PARANORMAL', '03:00 da manhã.\nSua fatura chegou.', 'cream'), 'memeFatura'],
  ].map(([speaker, text, card, reference], index) => reaction(`resenha-meme-${index + 1}`, speaker, text, { card, reference, minute: index * 2 }));

  const vip = [
    [0, 'Na cobertura aparece “Dani”. Minha agenda tem “Daniel encanador” e ele também nunca atende no domingo.', 'dani', meme('CONTATOS VIP', 'Eles: Dani.\nEu: Daniel encanador.')],
    [1, 'Uns têm o contato “Dani”. Eu tenho quarenta minutos de flauta no SAC. O atendimento é tão humanizado que até a gravação parece cansada de mim.', 'dani'],
    [2, 'Queria esse networking de apelido curto. No meu WhatsApp, quem me chama de “querida” está vendendo seguro. Carinho aqui só com franquia.', 'dani', meme('CARINHO DO BANCO', '“Você é muito especial.”\nContrate nosso seguro.', 'neutral')],
    [5, 'Depois da confusão do “lindão” contestado, meu fone pediu demissão. Disse que só volta com advogado e adicional por interpretação de áudio.', 'lindao', meme('FONE EM GREVE', 'Não transcrevo mais nada\nsem meu advogado.', 'cream')],
    [3, 'Meu meme é sobre a confusão da escuta: dei play, li o contexto e agora só chamo o entregador de “moço”, por segurança vocabular 😂', 'lindao'],
    [4, 'O único lindão confirmado nesta conversa fictícia é o pão de queijo que acabou de sair do forno.', 'lindao', meme('LINDÃO CONFIRMADO', 'O pão de queijo\nda minha cozinha.')],
    [0, 'Na mensagem ele fala em jantar com o Huck. Eu também fui jantar: botei o prato perto da TV. Minha participação foi essa.', 'huck', meme('JANTAR COM FAMOSO', 'Meu prato. Minha TV.\nMesa reservada no sofá.')],
    [1, 'Li a referência ao jantar e fui conferir meu convite. Era só o mercado avisando que a farofa entrou em promoção.', 'huck'],
    [2, 'Meu inner circle é exclusivíssimo: eu, a fatura e o medo. Ninguém brinda porque o gelo já está no estômago.', 'huck', meme('MEU INNER CIRCLE', 'Eu, a fatura e o medo.\nO gelo já está no estômago.', 'cream')],
    [3, 'Na mensagem sobre Anitta, a reunião era pra ser rápida. Minha reunião sobre a impressora já passou de uma hora.', 'anitta', meme('REUNIÃO RÁPIDA', 'Uma pauta. Três cafés.\nA impressora segue offline.')],
    [4, 'Se a minha agenda tivesse uma referência à Anitta, eu precisaria de uns dez minutos só pra escolher o fundo da chamada.', 'anitta'],
    [5, 'Minha participação no mundo pop é descobrir a música quando todo mundo já enjoou. Assessoria de tendências atrasadas.', 'anitta', meme('MEU RADAR POP', 'Cheguei na tendência.\nEla já tinha ido embora.', 'neutral')],
    [0, 'Miami aparece na conversa. Meu saldo também fez uma viagem: foi embora sem mim, não mandou foto e deixou os juros de lembrancinha.', 'miami', meme('FÉRIAS DO MEU SALDO', 'Foi embora sem mim.\nMandou juros de lembrança.', 'cream')],
    [1, 'O roteiro dessa resenha passa por Miami. O meu passa no mercado, na farmácia e, se sobrar bateria, na padaria.', 'miami'],
    [2, 'Meu fuso é mais complexo que Miami: trabalho no presente, pago o passado e adio o futuro. A classe econômica agora inclui viagem no tempo.', 'miami', meme('MEUS TRÊS FUSOS', 'Trabalho no presente.\nPago o passado.\nAdio o futuro.')],
    [3, 'A cobertura menciona evento em Londres. Meu evento internacional de hoje foi um chá de saquinho com nome em inglês.', 'londres', meme('EVENTO EM LONDRES', 'Minha versão:\nchá na caneca lascada.', 'neutral')],
    [4, 'O dress code do meu camarote é roupa preta: luto pelo poder de compra. O ingresso foi caro, mas o sofrimento é all inclusive.', 'londres'],
    [5, 'Saí da leitura com uma certeza: meu convite VIP continua sendo o da minha mãe pra almoçar domingo. Esse eu confirmo presença.', 'londres', meme('MEU CONVITE VIP', 'Almoço de domingo.\nLista: minha mãe já decidiu.')],
    [0, 'Será que o Vorcaro era o “fantasma” de que a Yasmin Brunet falava no BBB? Entrei nessa teoria pelo paredão e saí procurando um médium com assinatura do pay-per-view.', 'yasminFantasma', meme('BBB OU CAÇA-FANTASMAS?', 'Fui acompanhar o paredão.\nSaí procurando um médium.')],
    [1, 'Se essa teoria da Yasmin virasse filme, o fantasma não aparecia no espelho. Só em reunião que poderia ter sido um e-mail. O verdadeiro terror corporativo.', 'yasminFantasma', meme('ASSOMBRAÇÃO CORPORATIVA', 'Não aparece no espelho.\nAparece na reunião das 7h.', 'neutral')],
    [2, 'Na versão Scooby-Doo dessa teoria, eu ia puxar o lençol do fantasma e encontrar meu gerente oferecendo previdência privada. Nem no sobrenatural eu escapo da meta dele.', 'yasminFantasma', meme('PUXEI O LENÇOL', 'Era meu gerente:\n“Já pensou na aposentadoria?”', 'cream')],
    [5, 'A teoria do fantasma da Yasmin ainda não tem identidade confirmada. O único espírito que eu reconheço sem perícia é o do meu salário: mal entrou na conta e já foi para um lugar melhor.', 'yasminFantasma', meme('FANTASMA COMPROVADO', 'Meu salário.\nApareceu e logo desencarnou.')],
  ].map(([speaker, text, reference, card], index) => reaction(`resenha-vip-${index + 1}`, speaker, text, { reference, card, minute: 60 + index * 3 }));

  return [
    group('fofocas-avisos', 'Avisos', [
      reaction('resenha-aviso-1', 0, 'Boas-vindas à resenha! Os nomes, horários e comentários daqui são fictícios, criados para brincar com os assuntos do acervo. Pode pegar um café imaginário e escolher seu grupo.'),
      reaction('resenha-aviso-2', 1, 'Em Peleleca, Memes & Colação, o vocabulário do acervo encontra o humor do dia a dia. Tem corretor automático cansado, café frio e boleto pedindo atenção.', { minute: 2 }),
      reaction('resenha-aviso-3', 2, 'No VIPs, Famosos & Camarotes, cada brincadeira tem uma referência real em “Contexto da resenha”. São reações inventadas, não mensagens dos famosos citados.', { minute: 4 }),
      reaction('resenha-aviso-4', 3, 'Pra acompanhar documentos e notícias com fontes, a outra comunidade é Notícias e Documentos. Aqui a programação é café, contexto e resenha — nessa ordem ou na que o café permitir.', { minute: 6 }),
    ], { announcement: true }),
    group('fofocas-memes', 'Peleleca, Memes & Colação', memes),
    group('fofocas-famosos', 'VIPs, Famosos & Camarotes', vip),
  ];
}
