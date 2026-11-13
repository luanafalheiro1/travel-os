import type { Category, CheckGroup, DB, Day, Item, Leg, Stay } from '../types';
import { uid } from '../lib/util';
import { london2027Days } from './london2027';

/* Reservas e trechos da Eurotrip 2027 (pasta "Eurotrip 2", conferida em 13/11/2026)
   e o plano decidido para 23 e 24/04: dormir perto de Heathrow e voar cedo para Amsterdã.
   Sem números de confirmação nem códigos: o repositório é público. */

type P = [name: string, lat: number, lng: number, cat: Category, opts?: { note?: string; time?: string; dur?: number; q?: string | null; cost?: string }];

function it([name, lat, lng, category, o = {}]: P): Item {
  return { id: uid(), name, category, note: o.note, time: o.time, duration: o.dur, cost: o.cost, approx: { lat, lng }, q: o.q === undefined ? name : o.q };
}

const APRIL: { date: string; city: string; title?: string; note?: string; items: P[] }[] = [
  {
    date: '2027-04-22', city: 'Rio', title: 'Embarque para a Europa',
    note: 'Na ida a passagem não inclui mala despachada: só mala de mão.',
    items: [
      ['Aeroporto do Galeão (GIG), Terminal 2', -22.8090, -43.2506, 'transporte', { time: '16:15', note: 'Chegar 3h antes. Voo Iberia IB0270 às 19:15 para Madri.', q: 'Aeroporto Internacional do Rio de Janeiro Galeão' }],
    ],
  },
  {
    date: '2027-04-23', city: 'Londres', title: 'Chegada e fim de tarde em Windsor',
    note: 'Pouso às 14:55 no T5. Noite no ibis Heathrow para voar cedo a Amsterdã. Windsor fica a cerca de 20 min do aeroporto e não está no roteiro de maio. O castelo fecha às 17:15: o passeio é por fora, na cidade e na beira do rio. Pôr do sol por volta das 20:10.',
    items: [
      ['Heathrow Terminal 5', 51.4723, -0.4885, 'transporte', { time: '14:55', note: 'Voo IB0717 vindo de Madri. Imigração e saída: contem de 45 min a 1h30.', q: 'Heathrow Terminal 5' }],
      ['ibis London Heathrow Airport', 51.4813, -0.4378, 'transporte', { time: '16:00', note: 'Check-in a partir das 15h. Deixar as malas e sair. Fica na Bath Road, a cerca de 15 min dos terminais.', q: 'ibis London Heathrow Airport, Bath Road' }],
      ['Castelo de Windsor (por fora)', 51.4839, -0.6044, 'foto', { time: '17:15', note: 'Táxi ou Uber de cerca de 15 a 20 min. Ônibus 5 sai do T5 a cada hora.', q: 'Windsor Castle' }],
      ['The Long Walk', 51.4790, -0.6015, 'passeio', { note: 'Avenida reta de 4 km com vista do castelo. Andem só o começo, até onde der vontade.', q: 'The Long Walk, Windsor' }],
      ['The Two Brewers', 51.4818, -0.6033, 'comida', { time: '18:45', note: 'Pub pequeno na Park Street, colado à Long Walk. Lota cedo; se estiver cheio, sigam para a beira do rio.', q: 'The Two Brewers, Park Street, Windsor' }],
      ['Eton Bridge e Eton High Street', 51.4862, -0.6090, 'passeio', { note: 'Ponte de pedestres sobre o Tâmisa, com o castelo atrás. Do outro lado, a rua principal de Eton.', q: 'Windsor Bridge, Eton' }],
      ['Beira-rio de Windsor no pôr do sol', 51.4857, -0.6070, 'foto', { time: '20:00', note: 'Cisnes, barcos e o castelo iluminado.', q: 'Alexandra Gardens, Windsor' }],
      ['Volta para o hotel', 51.4813, -0.4378, 'transporte', { time: '21:15', note: 'Táxi ou Uber de volta. Fazer o check-in online do voo e deixar tudo pronto.', q: null }],
    ],
  },
  {
    date: '2027-04-24', city: 'Amsterdã', title: 'Voo cedo e primeiro dia em Amsterdã',
    note: 'Opções com mala de mão: KLM 06:30 → 08:50 (T4, cerca de R$ 411 por pessoa; confirmar a mala antes de pagar) ou British Airways 07:30 → 09:50 e 08:15 → 10:35 (T5, cerca de R$ 549). Check-in no hotel só às 15h: deixar as malas e passear.',
    items: [
      ['Heathrow (voo para Amsterdã)', 51.4700, -0.4543, 'transporte', { time: '05:00', note: 'Saída do hotel por volta das 04:45 para o KLM das 06:30, ou das 06:30 para o BA das 08:15.', q: 'Heathrow Airport' }],
      ['Aeroporto de Schiphol', 52.3105, 4.7683, 'transporte', { time: '09:00', note: 'Trem até a estação Lelylaan e um trecho curto até o hotel, cerca de 20 min no total.', q: 'Amsterdam Airport Schiphol' }],
      ['Best Western Amsterdam', 52.3489, 4.8424, 'transporte', { time: '10:30', note: 'Deixar as malas. Check-in a partir das 15h.', q: 'Best Western Amsterdam, Voorburgstraat 250' }],
    ],
  },
  { date: '2027-04-25', city: 'Amsterdã', items: [] },
  { date: '2027-04-26', city: 'Bruxelas', title: 'Trem para Bruxelas', note: 'Saída do hotel de Amsterdã até 11h.', items: [] },
  { date: '2027-04-27', city: 'Bruxelas', items: [] },
  { date: '2027-04-28', city: 'Milão', title: 'Voo para Milão', note: 'Saída do Bedford até 12h. Check-in no Ibis Milano Centro a partir das 14h.', items: [] },
  { date: '2027-04-29', city: 'Milão', items: [] },
  { date: '2027-04-30', city: 'Milão', items: [] },
  { date: '2027-05-01', city: 'Milão', items: [] },
];

export function april2027Days(): Day[] {
  return APRIL.map(d => ({ date: d.date, city: d.city, title: d.title, note: d.note, items: d.items.map(it) }));
}

export function stays2027(): Stay[] {
  return [
    {
      id: uid(), city: 'Londres', name: 'ibis London Heathrow Airport', checkin: '2027-04-23', checkout: '2027-04-24', booked: false,
      q: 'ibis London Heathrow Airport, Bath Road',
      info: [['Situação', 'A reservar. No Booking em 13/11/2026: £ 59 a noite para o casal'], ['Check-in / saída', 'A partir das 15h / até 12h']],
    },
    {
      id: uid(), city: 'Amsterdã', name: 'Best Western Amsterdam', checkin: '2027-04-24', checkout: '2027-04-26', booked: false,
      q: 'Best Western Amsterdam, Voorburgstraat 250',
      info: [
        ['Situação', 'Fazer reserva nova de 24 a 26/04 (no Booking em 13/11/2026: € 314 com taxas). Depois cancelar a reserva atual de 23 a 26/04'],
        ['Reserva atual (23 a 26/04)', '€ 586,85, paga no hotel. Cancelamento grátis até 22/04/2027, 18h. Datas não podem ser alteradas'],
        ['Endereço', 'Voorburgstraat 250, Slotervaart'], ['Check-in / saída', 'A partir das 15h / até 11h'],
      ],
    },
    {
      id: uid(), city: 'Bruxelas', name: 'Bedford Hotel Brussels', checkin: '2027-04-26', checkout: '2027-04-28', booked: true,
      q: 'Bedford Hotel Brussels, Rue du Midi 135',
      info: [
        ['Valor', '€ 285,09, pago no hotel'], ['Caução', '€ 150 no cartão de crédito, devolvida na saída'],
        ['Cancelamento grátis', 'Até 24/04/2027, 23:59'], ['Check-in / saída', 'A partir das 15h / até 12h'], ['Endereço', 'Rue du Midi 135'],
      ],
    },
    {
      id: uid(), city: 'Milão', name: 'Ibis Milano Centro', checkin: '2027-04-28', checkout: '2027-05-02', booked: true,
      q: 'Ibis Milano Centro, Via Finocchiaro Aprile 2',
      info: [
        ['Valor', '€ 596 com taxa de turismo, pago no hotel'], ['Cancelamento grátis', 'Até 27/04/2027, 23:59'],
        ['Check-in / saída', 'A partir das 14h / até 12h'], ['Endereço', 'Via Finocchiaro Aprile 2, ao lado da Milano Centrale'],
      ],
    },
    {
      id: uid(), city: 'Londres', name: 'Studios2Let North Gower', checkin: '2027-05-02', checkout: '2027-05-08', booked: true,
      q: 'Studios2Let North Gower, 192 North Gower Street',
      info: [
        ['Valor', '£ 672,30, pago no hotel'], ['Cancelamento grátis', 'Até 30/04/2027, 23:59'],
        ['Check-in', 'Das 14h às 18h30. Depois disso, combinar a entrega da chave antes'], ['Saída', 'Das 07:30 às 11h'],
        ['Atenção', 'Prédio sem elevador'], ['Endereço', '192 North Gower St, Camden'],
      ],
    },
    {
      id: uid(), city: 'Londres', name: 'ibis London Heathrow Airport', checkin: '2027-05-08', checkout: '2027-05-09', booked: true,
      q: 'ibis London Heathrow Airport, Bath Road',
      info: [['Valor', '£ 71,10, pago no hotel'], ['Check-in / saída', 'A partir das 15h / até 12h'], ['Por quê', 'Voo de volta às 07:55 no T5']],
    },
  ];
}

export function legs2027(milanToLondon: Leg[]): Leg[] {
  return [
    { id: uid(), date: '2027-04-22', from: 'Rio (GIG)', to: 'Madri', mode: 'Avião', dep: '19:15', arr: '09:55', arrDate: '2027-04-23', booked: true, note: 'Iberia IB0270. Sem mala despachada na ida.' },
    { id: uid(), date: '2027-04-23', from: 'Madri', to: 'Londres Heathrow (T5)', mode: 'Avião', dep: '13:25', arr: '14:55', booked: true, note: 'Iberia IB0717.' },
    { id: uid(), date: '2027-04-24', from: 'Londres Heathrow', to: 'Amsterdã Schiphol', mode: 'Avião', dep: '06:30', arr: '08:50', booked: false, note: 'A comprar. KLM 06:30 (T4, ~R$ 411 por pessoa, confirmar mala de mão) ou BA 07:30 / 08:15 (T5, ~R$ 549).' },
    { id: uid(), date: '2027-04-26', from: 'Amsterdã', to: 'Bruxelas', mode: 'Trem', booked: false, note: 'A comprar. Eurostar direto, cerca de 2h (£ 82,50 por pessoa na maioria dos horários). Ver também o Eurocity Direct.' },
    { id: uid(), date: '2027-04-28', from: 'Bruxelas', to: 'Milão Linate', mode: 'Avião', dep: '10:50', arr: '12:20', booked: false, note: 'A comprar. Brussels Airlines com mala de mão: 10:50 (~R$ 428 por pessoa) ou 07:15 (~R$ 384).' },
    ...milanToLondon,
    { id: uid(), date: '2027-05-09', from: 'Londres Heathrow (T5)', to: 'Madri', mode: 'Avião', dep: '07:55', arr: '11:20', booked: true, note: 'Iberia IB3643. Uma mala despachada por pessoa na volta.' },
    { id: uid(), date: '2027-05-09', from: 'Madri', to: 'Rio (GIG)', mode: 'Avião', dep: '12:15', arr: '17:35', booked: true, note: 'Iberia IB0269.' },
  ];
}

const CHECK_TITLE = 'Hospedagem de 23 e 24/04 (até 22/04)';
export function checklist2027(): CheckGroup {
  const items: string[] = [
    'Reservar o ibis London Heathrow Airport para 23/04',
    'Reservar o Best Western Amsterdam de 24 a 26/04 (reserva nova)',
    'Cancelar a reserva atual do Best Western (23 a 26/04), grátis até 22/04 às 18h',
    'Comprar o voo Heathrow → Amsterdã de 24/04, com mala de mão',
    'Comprar o trem Amsterdã → Bruxelas de 26/04',
    'Comprar o voo Bruxelas → Milão de 28/04, com mala de mão',
    'Comprar o voo Milão → Londres de 02/05, pousando até o começo da tarde',
    'Avisar o Studios2Let do horário de chegada em 02/05',
    'ETA do Reino Unido para os dois (gov.uk)',
  ];
  return { id: uid(), title: CHECK_TITLE, items: items.map(text => ({ id: uid(), text, done: false })) };
}

export const PLAN_NOTE = 'Abril: dia 23 em Windsor e noite no ibis Heathrow, voo cedo para Amsterdã em 24/04. Hotéis de Amsterdã, Bruxelas, Milão e Londres já reservados (aba Reservas). Faltam os transportes entre as cidades.';

/** Leva as novidades para quem já abriu o app (os dados ficam salvos no aparelho). */
export function patch2027(db: DB): DB {
  const done = db.patches || [];
  if (done.includes('2027-reservas')) return db;
  const trips = db.trips.map(t => {
    if (t.id !== 'eurotrip-2027') return t;
    const fresh = april2027Days();
    const london = london2027Days();
    const moved: Item[] = [];
    const days = t.days.map(d => {
      const f = fresh.find(x => x.date === d.date);
      if (f && d.items.length === 0) return f;
      // 09/05: o voo é às 07:55, a manhã livre não existe mais
      if (d.date === '2027-05-09' && d.items.some(i => i.name === 'Columbia Road Flower Market')) {
        moved.push(...d.items.filter(i => i.category !== 'transporte'));
        return london.find(x => x.date === d.date) || d;
      }
      if (d.date === '2027-05-08') {
        const n = london.find(x => x.date === d.date);
        if (n && d.note && !d.note.includes('ibis')) return { ...d, note: n.note };
      }
      return d;
    });
    const milan = t.legs.filter(l => l.date >= '2027-05-02' && l.date <= '2027-05-08');
    const userStays = t.stays.filter(s => !stays2027().some(n => n.name === s.name && n.checkin === s.checkin));
    return {
      ...t,
      days,
      legs: legs2027(milan),
      stays: [...stays2027(), ...userStays],
      checklist: t.checklist.some(g => g.title === CHECK_TITLE) ? t.checklist : [checklist2027(), ...t.checklist],
      planNote: PLAN_NOTE,
      ideas: [...(t.ideas || []), ...moved.map(i => i.name === 'Columbia Road Flower Market'
        ? { ...i, time: undefined, note: 'Feira de flores, só aos domingos. O único domingo em Londres é 02/05, dia da chegada.' }
        : { ...i, time: undefined })],
    };
  });
  return { ...db, trips, patches: [...done, '2027-reservas'] };
}
