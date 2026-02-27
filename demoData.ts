import { Email, EmailStatus, Sentiment } from './types';

export const getDemoEmails = (): Email[] => {
  const now = new Date();
  
  const createDate = (daysAgo: number, hoursAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursAgo);
    return d.toISOString();
  };

  return [
    {
      id: 'DEMO-001',
      from: 'max.mustermann@gmail.com',
      to: 'zentrale@baeckerei.de',
      subject: 'Brot war leider verbrannt',
      date: createDate(1, 2),
      body: 'Sehr geehrte Damen und Herren,\n\nich habe gestern in Ihrer Filiale in der Innenstadt ein Brot gekauft. Leider musste ich zu Hause feststellen, dass es auf der Unterseite komplett verbrannt war. Das ist sehr ärgerlich.',
      summary: 'Kunde beschwert sich über ein verbranntes Brot aus der Filiale Innenstadt.',
      sentiment: Sentiment.NEGATIVE,
      category: 'Produkt',
      product: 'Mischbrot',
      branch: 'Filiale 01 - Innenstadt',
      reason: 'Brot war verbrannt.',
      status: EmailStatus.OPEN,
      isDemo: true
    },
    {
      id: 'DEMO-002',
      from: 'sarah.schmidt@web.de',
      to: 'zentrale@baeckerei.de',
      subject: 'Super Service am Bahnhof!',
      date: createDate(0, 5),
      body: 'Hallo,\n\nich wollte nur mal ein Lob für die nette Verkäuferin am Bahnhof aussprechen. Trotz des großen Andrangs war sie super freundlich und schnell. Komme gerne wieder!',
      summary: 'Positives Feedback zum Service in der Filiale am Bahnhof.',
      sentiment: Sentiment.POSITIVE,
      category: 'Service',
      product: 'Diverse',
      branch: 'Filiale 12 - Bahnhof',
      reason: 'Lob für freundliches Personal.',
      status: EmailStatus.CLOSED,
      isDemo: true
    },
    {
      id: 'DEMO-003',
      from: 'klaus.klein@t-online.de',
      to: 'zentrale@baeckerei.de',
      subject: 'Brötchen nicht durchgebacken',
      date: createDate(3, 1),
      body: 'Guten Tag,\n\ndie Brötchen, die ich heute Morgen im Einkaufszentrum gekauft habe, waren leider noch fast roh von innen. Ich musste sie im Ofen fertig backen.',
      summary: 'Brötchen aus der Filiale Einkaufszentrum waren nicht vollständig durchgebacken.',
      sentiment: Sentiment.NEGATIVE,
      category: 'Produkt',
      product: 'Kaiserbrötchen',
      branch: 'Filiale 27 - Einkaufszentrum',
      reason: 'Brötchen waren nicht vollständig durchgebacken.',
      status: EmailStatus.IN_PROGRESS,
      isDemo: true
    },
    {
      id: 'DEMO-004',
      from: 'logistik@lieferdienst.de',
      to: 'zentrale@baeckerei.de',
      subject: 'Falsche Lieferung erhalten',
      date: createDate(2, 4),
      body: 'Achtung: Die Lieferung für die Filiale 01 wurde versehentlich an die Filiale 12 geliefert. Bitte um Korrektur.',
      summary: 'Logistikfehler: Falsche Bestellung an falsche Filiale geliefert.',
      sentiment: Sentiment.NEUTRAL,
      category: 'Transport',
      product: 'Gesamtlieferung',
      branch: 'Filiale 12 - Bahnhof',
      reason: 'Falsche Bestellung an falsche Filiale geliefert.',
      status: EmailStatus.OPEN,
      isDemo: true
    },
    {
      id: 'DEMO-005',
      from: 'hygiene-check@stadt.de',
      to: 'zentrale@baeckerei.de',
      subject: 'Hinweis zur Sauberkeit',
      date: createDate(5, 8),
      body: 'Bei einer Begehung der Filiale 27 wurde festgestellt, dass der Kundenbereich im hinteren Teil verschmutzt war. Bitte um Reinigung.',
      summary: 'Mangelnde Sauberkeit im Kundenbereich der Filiale Einkaufszentrum festgestellt.',
      sentiment: Sentiment.NEGATIVE,
      category: 'Hygiene',
      product: 'N/A',
      branch: 'Filiale 27 - Einkaufszentrum',
      reason: 'Kundenbereich war verschmutzt.',
      status: EmailStatus.OPEN,
      isDemo: true
    },
    {
      id: 'DEMO-006',
      from: 'mitarbeiter-x@baeckerei.de',
      to: 'zentrale@baeckerei.de',
      subject: 'Defekte Kühlung',
      date: createDate(0, 1),
      body: 'Die Kühlung in der Filiale Innenstadt scheint nicht richtig zu funktionieren. Die Temperatur liegt bei 12 Grad.',
      summary: 'Technische Störung: Kühlkette wurde vermutlich unterbrochen.',
      sentiment: Sentiment.NEGATIVE,
      category: 'Transport',
      product: 'Kühlware',
      branch: 'Filiale 01 - Innenstadt',
      reason: 'Kühlkette wurde vermutlich unterbrochen.',
      status: EmailStatus.IN_PROGRESS,
      isDemo: true
    },
    {
      id: 'DEMO-007',
      from: 'bernd.brot@gmx.de',
      to: 'zentrale@baeckerei.de',
      subject: 'Fehlende Teilchen in der Tüte',
      date: createDate(4, 3),
      body: 'Ich habe 5 Puddingteilchen bestellt, aber nur 4 waren in der Tüte. Bezahlt habe ich aber alle 5.',
      summary: 'Kommissionierfehler: Zu wenig Ware eingepackt.',
      sentiment: Sentiment.NEGATIVE,
      category: 'Kommissionierfehler',
      product: 'Puddingteilchen',
      branch: 'Filiale 12 - Bahnhof',
      reason: 'Zu wenig Ware eingepackt.',
      status: EmailStatus.OPEN,
      isDemo: true
    },
    {
      id: 'DEMO-008',
      from: 'anonym@web.de',
      to: 'zentrale@baeckerei.de',
      subject: 'Allgemeine Anfrage',
      date: createDate(10, 12),
      body: 'Bieten Sie auch vegane Torten auf Bestellung an?',
      summary: 'Kundenanfrage zu veganen Torten.',
      sentiment: Sentiment.NEUTRAL,
      category: 'Sonstiges',
      product: 'Torten',
      branch: 'Filiale 01 - Innenstadt',
      reason: 'Anfrage zu Sortiment.',
      status: EmailStatus.CLOSED,
      isDemo: true
    }
  ];
};
