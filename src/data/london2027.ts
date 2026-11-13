import type { Category, Day, Item, Leg } from '../types';
import { uid } from '../lib/util';

/* Roteiro de Londres e Manchester (02 a 09/05/2027), montado a partir do documento
   "Londres e Manchester · maio 2027" e das listas salvas no Google Maps.
   As coordenadas em `approx` são aproximadas e servem só para estimar o tempo entre os lugares;
   o botão "Localizar no mapa" troca por coordenadas exatas do Google. */

type P = [name: string, lat: number, lng: number, cat: Category, opts?: { note?: string; time?: string; dur?: number; q?: string; cost?: string }];

function it([name, lat, lng, category, o = {}]: P, city: string): Item {
  return { id: uid(), name, category, note: o.note, time: o.time, duration: o.dur, cost: o.cost, approx: { lat, lng }, q: o.q || `${name}, ${city}` };
}

const L = 'London', M = 'Manchester';

const DAYS: { date: string; city: string; title: string; note?: string; q: string; items: P[] }[] = [
  {
    date: '2027-05-02', city: 'Londres', q: L, title: 'Chegada e Westminster à noite',
    note: 'Dia leve, ajustado ao horário do voo vindo de Milão. Se chegarem tarde, comecem direto pelo London Eye.',
    items: [
      ['Tate Britain', 51.4910, -0.1278, 'atracao', { note: 'Só se chegarem cedo. Gratuito.' }],
      ['The Black Dog', 51.4880, -0.1205, 'foto', { note: 'Só foto da fachada (pub da música da Taylor Swift). Fica em Vauxhall, do outro lado da Vauxhall Bridge.', q: 'The Black Dog, Vauxhall Walk, London' }],
      ['The Graffiti Tunnel (Leake Street)', 51.5020, -0.1145, 'foto', { note: 'Só foto. Túnel de grafites embaixo da estação Waterloo.', q: 'Leake Street Graffiti Tunnel, London' }],
      ['London Eye e South Bank', 51.5033, -0.1196, 'passeio', { note: 'Caminhada pela beira do rio até a ponte.', q: 'London Eye, London' }],
      ['Westminster Bridge', 51.5009, -0.1218, 'foto', { note: 'A melhor foto do Big Ben é do lado do London Eye, olhando o rio.' }],
      ['Big Ben e Parlamento iluminados', 51.5007, -0.1246, 'atracao', { time: '21:00', note: 'O que faltou da última vez: ver aceso à noite.', q: 'Big Ben, London' }],
      ['St Stephen\'s Tavern', 51.5010, -0.1243, 'comida', { note: 'Pub em frente ao Big Ben.' }],
      ['Trafalgar Square', 51.5080, -0.1281, 'passeio'],
      ['Gordon\'s Wine Bar', 51.5081, -0.1239, 'comida', { note: 'Bar de vinhos à luz de velas, numa adega antiga.' }],
      ['Tattershall Castle', 51.5059, -0.1219, 'comida', { note: 'Pub num barco no Tâmisa. Para um drink ou só a foto.' }],
      ['Outernet London', 51.5161, -0.1307, 'atracao', { note: 'Telões imersivos gratuitos, na Charing Cross Road.' }],
    ],
  },
  {
    date: '2027-05-03', city: 'Londres', q: L, title: 'Little Venice, canal e Camden com calma',
    note: 'Feriado bancário no Reino Unido (Early May bank holiday). Camden e os parques ficam cheios e animados.',
    items: [
      ['Little Venice', 51.5225, -0.1830, 'passeio', { time: '10:00', note: 'Barcos coloridos no canal. Café num dos barcos-café. Metrô Warwick Avenue.' }],
      ['Barco London Waterbus até Camden', 51.5216, -0.1836, 'transporte', { dur: 45, cost: '£ 17 por adulto', note: 'Cerca de 45 min pelo Regent\'s Canal, passando pelo Regent\'s Park e pelo zoológico. Conferir o horário do feriado e chegar 10 min antes.', q: 'London Waterbus Company, Little Venice' }],
      ['Camden Lock Market', 51.5413, -0.1466, 'passeio', { note: 'Sem pressa: Stables Market, barracas de comida, eclusas e a Camden High Street.' }],
      ['Poppies Fish & Chips (Camden)', 51.5400, -0.1430, 'comida', { q: 'Poppies Fish & Chips Camden, London' }],
      ['The Hawley Arms', 51.5410, -0.1440, 'comida', { note: 'Pub clássico de Camden.' }],
      ['Word On The Water', 51.5355, -0.1250, 'compras', { note: 'Livraria num barco, no canal em King\'s Cross. Dá para ir a pé pela margem do canal.', q: 'Word On The Water, London Bookbarge' }],
      ['Primrose Hill', 51.5394, -0.1609, 'passeio', { time: '19:45', note: 'Vista do skyline e pôr do sol (por volta das 20h20 em maio). Alternativa: Hampstead Heath.' }],
      ['The Engineer', 51.5397, -0.1560, 'comida', { note: 'Pub em Primrose Hill, para fechar o dia.', q: 'The Engineer, Primrose Hill, London' }],
    ],
  },
  {
    date: '2027-05-04', city: 'Londres', q: L, title: 'City, London Bridge de dia e Sky Garden',
    note: 'Tudo a pé, cerca de 6 km, com pausas longas. Sky Garden em dia de semana só até 18h: reservar um horário entre 16h e 17h (vagas abrem 3 semanas antes).',
    items: [
      ['Catedral de St Paul\'s', 51.5138, -0.0984, 'atracao', { time: '08:30', dur: 90, cost: '£ 27 por adulto', note: 'Entrar na abertura. Inclui cripta e galerias da cúpula.', q: 'St Paul\'s Cathedral, London' }],
      ['Roof Terrace do One New Change', 51.5137, -0.0958, 'foto', { note: 'Mirante gratuito de frente para a cúpula do St Paul\'s.', q: 'One New Change Roof Terrace, London' }],
      ['Reflection Garden', 51.5129, -0.0962, 'foto', { note: 'Jardim na Cannon Street, 25.', q: 'Reflection Garden, 25 Cannon St, London' }],
      ['Millennium Bridge', 51.5095, -0.0985, 'foto'],
      ['Tate Modern (mirante)', 51.5076, -0.0994, 'atracao', { note: 'Mirante gratuito no último andar, com vista do St Paul\'s.', q: 'Tate Modern, London' }],
      ['Anchor Bankside', 51.5076, -0.0938, 'comida', { note: 'Pub histórico na beira do rio.' }],
      ['Borough Market', 51.5055, -0.0910, 'comida', { time: '12:30', note: 'Almoço com calma.' }],
      ['Southwark Cathedral', 51.5061, -0.0897, 'atracao'],
      ['London Bridge', 51.5079, -0.0877, 'foto', { note: 'Atravessar a pé, de dia, com vista da Tower Bridge.' }],
      ['Leadenhall Market', 51.5128, -0.0835, 'foto', { note: 'Mercado vitoriano coberto, cenário de Harry Potter.' }],
      ['Sky Garden', 51.5112, -0.0835, 'atracao', { time: '16:30', dur: 60, cost: 'Gratuito, com reserva', note: 'Reservar 3 semanas antes (por volta de 13/04/2027).' }],
      ['Horizon 22', 51.5147, -0.0834, 'atracao', { note: 'Opcional: outro mirante gratuito, também com reserva.' }],
      ['Torre de Londres', 51.5081, -0.0759, 'foto', { note: 'Só por fora.', q: 'Tower of London' }],
      ['Tower Bridge', 51.5055, -0.0754, 'foto', { note: 'Atravessar a ponte.' }],
      ['St Katharine Docks', 51.5066, -0.0717, 'passeio'],
      ['Aqua Shard', 51.5045, -0.0865, 'comida', { time: '20:00', note: 'Drink com vista no The Shard. Reservar.' }],
    ],
  },
  {
    date: '2027-05-05', city: 'Manchester', q: M, title: 'Bate-volta a Manchester',
    note: 'Sem jogo da Premier League nesta semana. Confirmar nos sites dos clubes que os tours funcionam em 05/05 antes de comprar o trem.',
    items: [
      ['Old Trafford', 53.4631, -2.2913, 'atracao', { time: '10:00', dur: 120, note: 'Tour do estádio e museu do Manchester United. Tram a partir do centro.', q: 'Old Trafford, Manchester' }],
      ['Mackie Mayor', 53.4864, -2.2378, 'comida', { time: '12:45', note: 'Almoço num mercado de comida em prédio histórico.' }],
      ['Northern Quarter', 53.4840, -2.2340, 'passeio', { note: 'Cafés, lojas e grafites.' }],
      ['Etihad Stadium', 53.4831, -2.2004, 'atracao', { time: '14:30', dur: 90, note: 'Opcional: tour do Manchester City.' }],
      ['John Rylands Library', 53.4804, -2.2484, 'atracao', { note: 'Biblioteca neogótica, entrada gratuita.' }],
      ['Manchester Cathedral', 53.4851, -2.2446, 'atracao'],
      ['Peveril of the Peak', 53.4767, -2.2462, 'comida', { note: 'Pub todo azulejado, antes do trem de volta.' }],
    ],
  },
  {
    date: '2027-05-06', city: 'Londres', q: L, title: 'Richmond, Chelsea, Harrods e peça',
    note: 'Richmond de manhã: parque vazio e cervos ativos. Tudo na linha District ou perto dela.',
    items: [
      ['Richmond Park (Pembroke Lodge)', 51.4468, -0.2963, 'passeio', { time: '09:00', note: 'Cervos soltos e o jardim do Pembroke Lodge.', q: 'Pembroke Lodge, Richmond Park' }],
      ['Vista do Richmond Hill', 51.4528, -0.2967, 'foto', { note: 'Vista protegida por lei, com o Tâmisa fazendo a curva.', q: 'Richmond Hill viewpoint, Richmond' }],
      ['Beira-rio de Richmond', 51.4577, -0.3074, 'passeio', { q: 'Richmond Riverside, Richmond' }],
      ['The White Cross', 51.4570, -0.3070, 'comida', { time: '12:30', note: 'Almoço num pub na beira do rio.', q: 'The White Cross, Richmond' }],
      ['Stamford Bridge', 51.4817, -0.1910, 'atracao', { time: '14:00', dur: 75, note: 'Tour do estádio do Chelsea. Metrô Fulham Broadway.', q: 'Stamford Bridge, London' }],
      ['Bywater Street', 51.4904, -0.1636, 'foto', { note: 'Só foto: casinhas coloridas em Chelsea.' }],
      ['King\'s Road e Sloane Square', 51.4924, -0.1565, 'compras', { q: 'Sloane Square, London' }],
      ['The Surprise', 51.4880, -0.1645, 'comida', { note: 'Pub em Chelsea.', q: 'The Surprise, Chelsea, London' }],
      ['Harrods', 51.4994, -0.1632, 'compras', { time: '16:30', note: 'Com calma. Não deixar de ver o Food Hall.' }],
      ['Kynance Mews', 51.4972, -0.1877, 'foto', { note: 'Só foto, se der tempo.' }],
      ['Peça no West End', 51.5117, -0.1240, 'atracao', { time: '19:30', dur: 165, note: 'Opções: Les Misérables (vende até out/2027), Matilda ou Harry Potter and the Cursed Child (Palace Theatre). Comprar no site do teatro.', q: 'Covent Garden, London' }],
    ],
  },
  {
    date: '2027-05-07', city: 'Londres', q: L, title: 'Tâmisa, Greenwich, Canary Wharf e Soho',
    items: [
      ['Uber Boat by Thames Clippers', 51.5016, -0.1232, 'transporte', { time: '09:30', note: 'Do píer de Westminster até Greenwich. Sentem do lado de fora para ver as pontes de dia.', q: 'Westminster Pier, London' }],
      ['Cutty Sark', 51.4827, -0.0096, 'foto'],
      ['Painted Hall', 51.4829, -0.0075, 'atracao', { note: 'No Old Royal Naval College. Pago.', q: 'Painted Hall, Greenwich' }],
      ['Greenwich Market', 51.4813, -0.0090, 'comida', { time: '12:30', note: 'Almoço.' }],
      ['Greenwich Park e a vista do General Wolfe', 51.4778, -0.0013, 'passeio', { note: 'A vista de Canary Wharf, da City e do Tâmisa de uma vez.', q: 'Statue of General Wolfe, Greenwich Park' }],
      ['Royal Observatory', 51.4769, -0.0005, 'atracao', { note: 'Opcional: linha do meridiano. Pago.' }],
      ['Canary Wharf e Crossrail Place Roof Garden', 51.5055, -0.0209, 'passeio', { note: 'Jardim coberto gratuito em cima da estação.', q: 'Crossrail Place Roof Garden, London' }],
      ['Fortnum & Mason e Diamond Jubilee Tea Salon', 51.5085, -0.1384, 'comida', { time: '17:00', note: 'Compras e chá da tarde. Reservar e confirmar o último horário do salão.', q: 'Fortnum & Mason, Piccadilly' }],
      ['Burlington Arcade', 51.5089, -0.1398, 'compras'],
      ['Waterstones Piccadilly', 51.5089, -0.1360, 'compras'],
      ['The Devonshire', 51.5104, -0.1348, 'comida', { note: 'Pub em Soho.', q: 'The Devonshire, Denman St, London' }],
      ['O\'Neill\'s Wardour Street', 51.5121, -0.1318, 'comida'],
      ['Goodwin\'s Court', 51.5109, -0.1267, 'foto', { note: 'Só foto: viela com lampiões a gás.' }],
      ['Neal\'s Yard', 51.5143, -0.1265, 'foto', { note: 'Só foto: pátio colorido.' }],
      ['Covent Garden Market e The Yards', 51.5120, -0.1225, 'passeio', { q: 'Covent Garden Market, London' }],
      ['Ben\'s Cookies (Covent Garden)', 51.5118, -0.1229, 'comida', { q: 'Ben\'s Cookies Covent Garden' }],
      ['The Lamb & Flag', 51.5117, -0.1260, 'comida', { note: 'Pub antigo no meio do West End.', q: 'Lamb and Flag, Covent Garden' }],
    ],
  },
  {
    date: '2027-05-08', city: 'Londres', q: L, title: 'Compras e jogo da Premier League',
    note: 'Fulham x Ipswich no Craven Cottage, marcado para 08/05. Horário a confirmar: a TV pode mudar até para domingo 09/05. Comprar ingresso só na bilheteria oficial, depois de confirmado. Saída do studio até 11h: deixar as malas num guarda-volumes no centro durante o dia e, à noite, seguir para o ibis Heathrow (voo de volta às 07:55).',
    items: [
      ['Baker Street', 51.5226, -0.1571, 'foto', { time: '09:30', note: 'Só foto.', q: 'Baker Street Station, London' }],
      ['Daunt Books Marylebone', 51.5203, -0.1520, 'compras'],
      ['Selfridges', 51.5144, -0.1527, 'compras', { q: 'Selfridges, Oxford Street' }],
      ['Primark e lojas da Oxford Street', 51.5152, -0.1418, 'compras', { q: 'Primark Oxford Street East, London' }],
      ['Regent Street e Liberty', 51.5139, -0.1400, 'compras', { q: 'Liberty London' }],
      ['Carnaby Street', 51.5130, -0.1388, 'compras'],
      ['Bishop\'s Park e Putney Bridge', 51.4685, -0.2127, 'passeio', { time: '13:00', note: 'Almoço perto de Putney Bridge e caminhada até o estádio pela beira do rio.', q: 'Bishop\'s Park, Fulham' }],
      ['Fulham x Ipswich Town (Craven Cottage)', 51.4749, -0.2217, 'atracao', { time: '15:00', dur: 120, note: 'Horário a confirmar. Se não der: tour do Emirates ou de Wembley.', q: 'Craven Cottage, London' }],
      ['Sky Garden no pôr do sol', 51.5112, -0.0835, 'atracao', { time: '19:30', note: 'Opcional: aos sábados aberto até 21h, com reserva. Ou jantar e pubs em Soho.', q: 'Sky Garden, London' }],
    ],
  },
  {
    date: '2027-05-09', city: 'Londres', q: L, title: 'Voo de volta',
    note: 'Iberia IB3643 às 07:55 no T5, com conexão em Madri e chegada ao Rio às 17:35. Na volta há uma mala despachada por pessoa.',
    items: [
      ['Heathrow Terminal 5', 51.4723, -0.4885, 'transporte', { time: '05:15', note: 'Saída do ibis Heathrow por volta das 05:00. Despachar as malas no balcão da Iberia.', q: 'Heathrow Terminal 5' }],
    ],
  },
];

/** Lugares salvos sem dia fixo: ficam em "Ideias sem dia" para arrastar quando quiserem. */
const IDEAS: P[] = [
  ['Museu Britânico', 51.5194, -0.1270, 'atracao', { note: 'Gratuito. Bom para dia de chuva.', q: 'British Museum, London' }],
  ['Bedford Square', 51.5185, -0.1307, 'foto', { note: 'Só foto, em Bloomsbury.' }],
  ['The Post Building Roof Garden', 51.5170, -0.1240, 'foto', { note: 'Jardim no terraço, em Holborn.' }],
  ['Sketch', 51.5126, -0.1415, 'comida', { note: 'Chá da tarde em Mayfair. Reservar.', q: 'Sketch, Conduit Street, London' }],
  ['Hampstead Heath (Parliament Hill)', 51.5596, -0.1608, 'passeio', { note: 'Alternativa ao Primrose Hill.', q: 'Parliament Hill, London' }],
  ['Emirates Stadium', 51.5549, -0.1084, 'atracao', { note: 'Tour do Arsenal. Alternativa se não houver jogo no sábado.' }],
  ['Estádio de Wembley', 51.5560, -0.2795, 'atracao', { note: 'Tour. Alternativa se não houver jogo no sábado.', q: 'Wembley Stadium, London' }],
  ['Victoria and Albert Museum', 51.4966, -0.1722, 'atracao', { note: 'Gratuito, perto da Harrods.' }],
  ['Chiswick', 51.4927, -0.2580, 'passeio', { note: 'No caminho de Richmond, mesma linha District.', q: 'Chiswick High Road, London' }],
  ['The Churchill Arms', 51.5069, -0.1949, 'comida', { note: 'Pub com fachada coberta de flores, na Kensington Church Street.', q: 'The Churchill Arms, Kensington' }],
  ['The George Inn', 51.5043, -0.0899, 'comida', { note: 'Estalagem do século XVII com galerias, em Southwark.', q: 'The George Inn, Southwark' }],
  ['The Prospect of Whitby', 51.5070, -0.0510, 'comida', { note: 'Um dos pubs mais antigos da beira do Tâmisa, em Wapping.', q: 'The Prospect of Whitby, Wapping' }],
  ['Brixton', 51.4626, -0.1145, 'passeio', { q: 'Brixton Village, London' }],
  ['Daunt Books Notting Hill', 51.5145, -0.2029, 'compras'],
  ['Columbia Road Flower Market', 51.5293, -0.0716, 'passeio', { note: 'Feira de flores, só aos domingos. O único domingo em Londres é 02/05, dia da chegada.' }],
  ['Brick Lane Vintage Market', 51.5219, -0.0718, 'compras', { q: 'The Brick Lane Vintage Market, London' }],
  ['Princelet Street', 51.5197, -0.0724, 'foto', { note: 'Só foto: casas georgianas coloridas em Spitalfields.' }],
  ['Universidade de Oxford', 51.7548, -1.2544, 'passeio', { note: 'Bate-volta possível, no lugar do dia de Greenwich.', q: 'University of Oxford' }],
];

export function london2027Days(): Day[] {
  return DAYS.map(d => ({ date: d.date, city: d.city, title: d.title, note: d.note, items: d.items.map(p => it(p, d.q)) }));
}
export function london2027Ideas(): Item[] { return IDEAS.map(p => it(p, L)); }
export function london2027Legs(): Leg[] {
  return [
    { id: uid(), date: '2027-05-02', from: 'Milão', to: 'Londres', mode: 'Avião', note: 'Horário a definir', booked: false },
    { id: uid(), date: '2027-05-05', from: 'London Euston', to: 'Manchester Piccadilly', mode: 'Trem', dep: '07:00', arr: '09:10', note: 'Horário sugerido, cerca de 2h10. Comprar com antecedência.', booked: false },
    { id: uid(), date: '2027-05-05', from: 'Manchester Piccadilly', to: 'London Euston', mode: 'Trem', dep: '19:30', arr: '21:40', note: 'Horário sugerido.', booked: false },
  ];
}
export const LONDON_CHECK: [string, number?][] = [
  ['Peça no West End (qui 06/05)'], ['Trem Londres ↔ Manchester (qua 05/05)'], ['Tours Old Trafford e Etihad (qua 05/05)'],
  ['Tour Stamford Bridge (qui 06/05)'], ['Sky Garden (ter 04/05; sáb 08/05 se quiserem o pôr do sol)'], ['St Paul\'s Cathedral (ter 04/05)'],
  ['Jogo de futebol (sáb 08/05), só depois do horário confirmado'], ['Barco Little Venice → Camden (seg 03/05)'], ['Aqua Shard (ter 04/05)'], ['Chá no Fortnum & Mason (sex 07/05)'],
];
