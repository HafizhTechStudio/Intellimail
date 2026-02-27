export enum EmailStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  CLOSED = 'Closed'
}

export enum Sentiment {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative'
}

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  summary?: string;
  cleanBody?: string;
  sentiment: Sentiment;
  category: string;
  product: string;
  branch: string;
  reason: string;
  images?: string[]; // Speichert extrahierte Bild-URLs (Base64)
  employeeId?: string;
  employeeName?: string;
  status: EmailStatus;
}

export interface AnalysisResult {
  sentiment: Sentiment;
  category: string;
  product: string;
  branch: string;
  reason: string;
  summary: string;
  cleanBody?: string;
  employeeId?: string;
  employeeName?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
}