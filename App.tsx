
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Email, EmailStatus, Sentiment } from './types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  CartesianGrid
} from 'recharts';
import { 
  Inbox, 
  FileUp, 
  Search, 
  Mail, 
  Building, 
  Tag, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  LayoutDashboard, 
  User, 
  ChevronLeft, 
  Filter, 
  PieChart as LucidePieChart, 
  Frown,
  ChevronDown,
  Paperclip,
  Utensils,
  X,
  Send,
  ArrowLeft
} from './components/Icons';
import { Users, Download, Upload, AlertTriangle } from 'lucide-react';
import { analyzeEmail } from './services/geminiService';
import { getDemoEmails } from './demoData';

// Hilfsfunktionen
const extractImagesFromRaw = (raw: string): string[] => {
  const images: string[] = [];
  const regex = /Content-Type: image\/(png|jpeg|jpg)[\s\S]*?base64\s+([\s\S]*?)(?=\r?\n\r?\n|\r?\n--)/gi;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const type = match[1];
    const data = match[2].replace(/\s/g, ''); 
    if (data.length > 100) images.push(`data:image/${type};base64,${data}`);
  }
  return images;
};

interface EmailDetailViewProps {
  email: Email;
  onBack: () => void;
  context?: 'inbox' | 'report';
  reportTitle?: string;
  onUpdateStatus?: (id: string, s: EmailStatus) => void;
  onUpdateSentiment?: (id: string, s: Sentiment) => void;
}

const EmailDetailView: React.FC<EmailDetailViewProps> = ({ 
  email, 
  onBack, 
  context = 'inbox', 
  reportTitle,
  onUpdateStatus, 
  onUpdateSentiment 
}) => {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<EmailStatus | null>(null);
  const [isSentimentDropdownOpen, setIsSentimentDropdownOpen] = useState(false);
  const [pendingSentiment, setPendingSentiment] = useState<Sentiment | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      setZoomedImage(src);
    }
  };

  return (
    <div className="min-h-full flex flex-col animate-in fade-in duration-300">
      <div className="p-6 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="p-3 hover:bg-slate-50 rounded-2xl text-slate-500 transition-all flex items-center gap-2 font-bold text-sm"
        >
          <ChevronLeft className="w-5 h-5" />
          {context === 'report' ? (reportTitle ? `Zurück zu ${reportTitle}` : 'Zurück zur Übersicht') : 'Zurück'}
        </button>
        <div className="flex gap-3">
          {email.status !== EmailStatus.CLOSED && onUpdateStatus && (
            <button 
              onClick={() => onUpdateStatus(email.id, EmailStatus.CLOSED)}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
            >
              <CheckCircle className="w-4 h-4" />
              Erledigen
            </button>
          )}
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/30">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative group/status">
                  <button 
                    onClick={() => email.status !== EmailStatus.CLOSED && setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className={`flex items-center gap-2 transition-all duration-300 ${email.status !== EmailStatus.CLOSED ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <StatusBadge 
                      status={pendingStatus || email.status} 
                      isInteractive={email.status !== EmailStatus.CLOSED} 
                    />
                    {email.status !== EmailStatus.CLOSED && (
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  
                  {isStatusDropdownOpen && email.status !== EmailStatus.CLOSED && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsStatusDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-3 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-200 origin-top-left">
                        <button 
                          onClick={() => {
                            setPendingStatus(EmailStatus.IN_PROGRESS);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-4 text-left text-[10px] font-black text-orange-600 hover:bg-orange-50 transition-colors uppercase tracking-[0.1em] flex items-center justify-between ${ (pendingStatus || email.status) === EmailStatus.IN_PROGRESS ? 'bg-orange-50/50' : '' }`}
                        >
                          <span>In Arbeit setzen</span>
                          <Clock className="w-4 h-4 opacity-70" />
                        </button>
                        <button 
                          onClick={() => {
                            setPendingStatus(EmailStatus.OPEN);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-4 text-left text-[10px] font-black text-blue-600 hover:bg-blue-50 transition-colors uppercase tracking-[0.1em] flex items-center justify-between border-t border-slate-50 ${ (pendingStatus || email.status) === EmailStatus.OPEN ? 'bg-blue-50/50' : '' }`}
                        >
                          <span>Zurück auf Offen</span>
                          <Inbox className="w-4 h-4 opacity-70" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {pendingStatus && pendingStatus !== email.status && onUpdateStatus && (
                  <button 
                    onClick={() => {
                      onUpdateStatus(email.id, pendingStatus);
                      setPendingStatus(null);
                    }}
                    className="px-5 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 animate-in slide-in-from-left-4 duration-500 flex items-center gap-2 active:scale-95"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Speichern
                  </button>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="relative group/sentiment">
                    <button 
                      onClick={() => setIsSentimentDropdownOpen(!isSentimentDropdownOpen)}
                      className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 hover:bg-white transition-all duration-200 hover:shadow-md active:scale-95"
                    >
                      <SentimentDot sentiment={pendingSentiment || email.sentiment} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {sentimentLabels[pendingSentiment || email.sentiment]}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${isSentimentDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSentimentDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsSentimentDropdownOpen(false)} />
                        <div className="absolute top-full left-0 mt-3 w-40 bg-white border border-slate-100 rounded-2xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-200 origin-top-left">
                          {(Object.values(Sentiment)).map((s) => (
                            <button 
                              key={s}
                              onClick={() => {
                                setPendingSentiment(s);
                                setIsSentimentDropdownOpen(false);
                              }}
                              className={`w-full px-5 py-3.5 text-left text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-[0.1em] flex items-center gap-3 ${ (pendingSentiment || email.sentiment) === s ? 'bg-slate-50' : '' }`}
                            >
                              <SentimentDot sentiment={s} />
                              <span>{sentimentLabels[s]}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {pendingSentiment && pendingSentiment !== email.sentiment && onUpdateSentiment && (
                    <button 
                      onClick={() => {
                        onUpdateSentiment(email.id, pendingSentiment);
                        setPendingSentiment(null);
                      }}
                      className="px-5 py-1.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 animate-in slide-in-from-left-4 duration-500 flex items-center gap-2 active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Speichern
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight">
                  {email.subject}
                </h1>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
                  Reklamations-Nr. <span className="text-rose-600">#{email.id}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Absender</span>
              <span className="text-xs font-bold text-slate-700 truncate">{email.from}</span>
            </div>
            <div className="flex flex-col gap-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Empfänger</span>
              <span className="text-xs font-bold text-slate-700 truncate">{email.to || 'Zentrale'}</span>
            </div>
            <div className="flex flex-col gap-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Datum</span>
              <span className="text-xs font-bold text-slate-700">{new Date(email.date).toLocaleString('de-DE')} Uhr</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Kategorie', value: email.category, icon: Tag },
            { label: 'Produkt', value: email.product, icon: Utensils },
            { label: 'Filiale', value: email.branch, icon: Building },
            { label: 'Mitarbeiter', value: email.employeeName || 'N/A', icon: User }
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <item.icon className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{item.label}</span>
                <span className="text-sm font-bold text-slate-800">{item.value || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Strukturierte Details</h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grund:</span>
                <p className="text-sm text-slate-700 font-medium">{email.reason || 'Keine Angabe'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personalnummer:</span>
                <p className="text-sm text-slate-700 font-medium">{email.employeeId || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-rose-50/30 rounded-[32px] border border-rose-100/50 p-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-widest">KI-Zusammenfassung</h3>
          </div>
          <p className="text-slate-700 font-medium italic leading-relaxed">
            {email.summary || "Die Analyse konnte nicht vollständig durchgeführt werden."}
          </p>
        </div>

        {email.images && email.images.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <Paperclip className="w-3 h-3" />
              Anhänge ({email.images.length})
            </h3>
            <div className="flex flex-wrap gap-4">
              {email.images.map((img, idx) => (
                <div key={idx} className="group relative w-32 h-32 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setZoomedImage(img)}>
                  <img src={img} alt={`Anhang ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex items-center justify-between w-full p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-all group"
          >
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">VOLLANSICHT / TEXTKÖRPER ANZEIGEN</span>
            <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${showOriginal ? 'rotate-180' : ''}`} />
          </button>
          
          {showOriginal && (
            <div 
              className="p-8 bg-white rounded-[32px] text-slate-700 text-sm font-sans whitespace-pre-wrap leading-relaxed border border-slate-100 shadow-sm animate-in fade-in duration-300 overflow-y-auto max-h-[600px] custom-scrollbar email-body-content"
              onClick={handleBodyClick}
              dangerouslySetInnerHTML={{ __html: email.cleanBody || email.body || "Inhalt konnte nicht verarbeitet werden." }}
            />
          )}
        </div>
      </div>
      
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={zoomedImage} 
            alt="Vergrößerte Ansicht" 
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

interface ReportDetailViewProps {
  title: string;
  emails: Email[];
  onBack: () => void;
  onUpdateStatus?: (id: string, s: EmailStatus) => void;
  onUpdateSentiment?: (id: string, s: Sentiment) => void;
}

const ReportDetailView: React.FC<ReportDetailViewProps> = ({ title, emails, onBack, onUpdateStatus, onUpdateSentiment }) => {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // kleine Auswertung:
  const total = emails.length;
  const open = emails.filter(e => e.status === EmailStatus.OPEN).length;
  const inProgress = emails.filter(e => e.status === EmailStatus.IN_PROGRESS).length;
  const done = emails.filter(e => e.status === EmailStatus.CLOSED).length;
  const negative = emails.filter(e => e.sentiment === Sentiment.NEGATIVE).length;

  if (selectedEmail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 inline-flex items-center gap-1"
          >
            ← Zurück zu Berichte
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Reklamationsberichte
          </span>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <EmailDetailView 
            email={selectedEmail} 
            onBack={() => setSelectedEmail(null)} 
            context="report"
            reportTitle={title}
            onUpdateStatus={onUpdateStatus}
            onUpdateSentiment={onUpdateSentiment}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 inline-flex items-center gap-1"
        >
          ← Zurück zu Berichte
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Reklamationsberichte
        </span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">
            Insgesamt {total} Reklamationen – {open} offen, {inProgress} in Arbeit, {done} erledigt, {negative} negativ.
          </p>
        </div>

        {/* einfache Liste der E-Mails */}
        <div className="divide-y divide-slate-100">
          {emails.length === 0 && (
            <p className="text-sm text-slate-400 py-4">Keine Daten verfügbar.</p>
          )}

          {emails.map(email => (
            <button 
              key={email.id} 
              onClick={() => setSelectedEmail(email)}
              className="w-full text-left py-4 flex items-start justify-between gap-4 hover:bg-slate-50 px-4 -mx-4 rounded-2xl transition-colors"
            >
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900">
                  {email.subject || 'Kein Betreff'}
                </div>
                <div className="text-xs text-slate-500">
                  {email.branch && <span className="mr-2">Filiale {email.branch}</span>}
                  {email.category && <span className="mr-2">| {email.category}</span>}
                  {email.product && <span className="mr-2">| {email.product}</span>}
                </div>
                {email.summary && (
                  <div className="text-xs text-slate-500 line-clamp-2">
                    {email.summary}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 text-xs shrink-0">
                <span className="text-slate-400">
                  {email.date ? new Date(email.date).toLocaleDateString('de-DE') : ''}
                </span>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-50 text-slate-500">
                  {email.status === EmailStatus.OPEN && 'Offen'}
                  {email.status === EmailStatus.IN_PROGRESS && 'In Arbeit'}
                  {email.status === EmailStatus.CLOSED && 'Erledigt'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status, isInteractive = false }: { status: EmailStatus, isInteractive?: boolean }) => {
  const styles = {
    [EmailStatus.OPEN]: "bg-blue-50 text-blue-700 border-blue-100 shadow-sm",
    [EmailStatus.IN_PROGRESS]: "bg-orange-50 text-orange-700 border-orange-100 shadow-sm",
    [EmailStatus.CLOSED]: "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm",
  };
  const label = status === EmailStatus.OPEN ? 'Offen' : status === EmailStatus.IN_PROGRESS ? 'In Arbeit' : 'Erledigt';
  return (
    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-2 transition-all duration-200 ${styles[status]} ${isInteractive ? 'hover:shadow-md hover:bg-white active:scale-95' : ''}`}>
      {status === EmailStatus.OPEN && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {status === EmailStatus.IN_PROGRESS && <Clock className="w-3 h-3" />}
      {status === EmailStatus.CLOSED && <CheckCircle className="w-3 h-3" />}
      {label}
    </span>
  );
};

const SentimentDot = ({ sentiment }: { sentiment: Sentiment }) => {
  const colors = {
    [Sentiment.POSITIVE]: "bg-emerald-500",
    [Sentiment.NEUTRAL]: "bg-slate-300",
    [Sentiment.NEGATIVE]: "bg-rose-500",
  };
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[sentiment]}`} />;
};

type UploadState = {
  status: "idle" | "uploading" | "done" | "error";
  total: number;
  processed: number;
};

// Erweiterter Filtertyp für "Offene Vorgänge" (Neu + In Arbeit)
type ExtendedStatusFilter = EmailStatus | 'All' | 'Active';

type StatsRange = 'today' | 'last7' | 'last30' | 'all';

type ReportView =
  | { mode: 'overview' }
  | { mode: 'branch'; branch: string }
  | { mode: 'category'; category: string }
  | { mode: 'reason'; reason: string }
  | { mode: 'product'; product: string };

const sentimentLabels: Record<Sentiment, string> = {
  [Sentiment.POSITIVE]: "Positiv",
  [Sentiment.NEUTRAL]: "Neutral",
  [Sentiment.NEGATIVE]: "Negativ"
};

const App: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ExtendedStatusFilter>('All');
  const [filterSentiment, setFilterSentiment] = useState<Sentiment | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'inbox' | 'stats' | 'reports'>('stats'); 
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', total: 0, processed: 0 });
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [statsRange, setStatsRange] = useState<StatsRange>('all');
  const [reportView, setReportView] = useState<ReportView>({ mode: 'overview' });

  // States für Statistik-Detailansicht
  const [statisticsMode, setStatisticsMode] = useState<'overview' | 'detail'>('overview');
  const [statisticsFilterType, setStatisticsFilterType] = useState<'status' | 'sentiment' | null>(null);
  const [statisticsFilterValue, setStatisticsFilterValue] = useState<string | null>(null);

  // States für Status-Dropdown
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<EmailStatus | null>(null);

  // States für Sentiment-Dropdown
  const [isSentimentDropdownOpen, setIsSentimentDropdownOpen] = useState(false);
  const [pendingSentiment, setPendingSentiment] = useState<Sentiment | null>(null);

  // AI Availability States
  const [isAiAvailable, setIsAiAvailable] = useState<boolean>(true);
  const [aiErrorCode, setAiErrorCode] = useState<string | null>(null);

  useEffect(() => {
    const checkAiStatus = async () => {
      try {
        const response = await fetch('/api/ai-status');
        const data = await response.json();
        if (!data.available) {
          setIsAiAvailable(false);
          setAiErrorCode(data.error);
        }
      } catch (err) {
        console.error("Failed to check AI status", err);
      }
    };
    checkAiStatus();
  }, []);

  // Auto-Select Logik
  useEffect(() => {
    if (activeTab === 'inbox' && emails.length > 0 && !selectedEmail) {
      setSelectedEmail(emails[0]);
    }
  }, [emails, activeTab, selectedEmail]);

  // Filter Logik inkl. 'Active' Support für Inbox
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            email.body.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = false;
      if (filterStatus === 'All') {
        matchesStatus = true;
      } else if (filterStatus === 'Active') {
        matchesStatus = email.status !== EmailStatus.CLOSED;
      } else {
        matchesStatus = email.status === filterStatus;
      }

      const matchesSentiment = filterSentiment === 'All' || email.sentiment === filterSentiment;
      return matchesSearch && matchesStatus && matchesSentiment;
    });
  }, [emails, searchTerm, filterStatus, filterSentiment]);

  const statsEmails = useMemo(() => {
    if (!emails || emails.length === 0) return [];

    const now = new Date();

    const isInRange = (dateStr: string | undefined | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;

      // Nur Datumsteil vergleichen
      const diffMs = now.getTime() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      switch (statsRange) {
        case 'today':
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        case 'last7':
          return diffDays <= 7 && diffDays >= 0;
        case 'last30':
          return diffDays <= 30 && diffDays >= 0;
        case 'all':
        default:
          return true;
      }
    };

    return emails.filter((email) => isInRange(email.date));
  }, [emails, statsRange]);

  // Statistik Logik
  const stats = useMemo(() => {
    let total = 0;
    let open = 0;
    let inProgress = 0;
    let done = 0;
    let negative = 0;

    const branches = new Set<string>();
    const reasons = new Set<string>();

    for (const email of statsEmails) {
      total++;

      if (email.status === EmailStatus.OPEN) open++;
      else if (email.status === EmailStatus.IN_PROGRESS) inProgress++;
      else if (email.status === EmailStatus.CLOSED) done++;

      if (email.sentiment === Sentiment.NEGATIVE) negative++;

      if (email.branch && email.branch.trim() !== '') {
        branches.add(email.branch.trim());
      }
      if (email.reason && email.reason.trim() !== '') {
        reasons.add(email.reason.trim());
      }
    }

    return {
      total,
      open,
      inProgress,
      done,
      negative,
      uniqueBranches: branches.size,
      uniqueReasons: reasons.size,
    };
  }, [statsEmails]);

  // Statistik-Detail Filter Logik
  const filteredStatsEmails = useMemo(() => {
    if (statisticsMode === 'overview') return [];
    
    return statsEmails.filter(email => {
      if (statisticsFilterType === 'status') {
        if (statisticsFilterValue === 'all') return true;
        if (statisticsFilterValue === 'open') return email.status !== EmailStatus.CLOSED;
        if (statisticsFilterValue === 'in_progress') return email.status === EmailStatus.IN_PROGRESS;
        if (statisticsFilterValue === 'closed') return email.status === EmailStatus.CLOSED;
      } else if (statisticsFilterType === 'sentiment') {
        if (statisticsFilterValue === 'positive') return email.sentiment === Sentiment.POSITIVE;
        if (statisticsFilterValue === 'neutral') return email.sentiment === Sentiment.NEUTRAL;
        if (statisticsFilterValue === 'negative') return email.sentiment === Sentiment.NEGATIVE;
      }
      return true;
    });
  }, [statsEmails, statisticsMode, statisticsFilterType, statisticsFilterValue]);

  // Berichte Logik
  const branchReports = useMemo(() => {
    const reports: Record<string, { branch: string, total: number, open: number, inProgress: number, closed: number, negative: number }> = {};
    
    emails.forEach(email => {
      const branch = email.branch || 'Unbekannt';
      if (!reports[branch]) {
        reports[branch] = { branch, total: 0, open: 0, inProgress: 0, closed: 0, negative: 0 };
      }
      reports[branch].total++;
      if (email.status === EmailStatus.OPEN) reports[branch].open++;
      if (email.status === EmailStatus.IN_PROGRESS) reports[branch].inProgress++;
      if (email.status === EmailStatus.CLOSED) reports[branch].closed++;
      if (email.sentiment === Sentiment.NEGATIVE) reports[branch].negative++;
    });

    return Object.values(reports).sort((a, b) => b.negative - a.negative);
  }, [emails]);

  const categoryReports = useMemo(() => {
    const reports: Record<string, { category: string, total: number, open: number, inProgress: number, closed: number, negative: number }> = {};
    
    emails.forEach(email => {
      const category = email.category || 'Ohne Kategorie';
      if (!reports[category]) {
        reports[category] = { category, total: 0, open: 0, inProgress: 0, closed: 0, negative: 0 };
      }
      reports[category].total++;
      if (email.status === EmailStatus.OPEN) reports[category].open++;
      if (email.status === EmailStatus.IN_PROGRESS) reports[category].inProgress++;
      if (email.status === EmailStatus.CLOSED) reports[category].closed++;
      if (email.sentiment === Sentiment.NEGATIVE) reports[category].negative++;
    });

    return Object.values(reports).sort((a, b) => b.negative - a.negative);
  }, [emails]);

  const reasonReports = useMemo(() => {
    const reports: Record<string, { reason: string, total: number, open: number, inProgress: number, closed: number, negative: number }> = {};
    
    emails.forEach(email => {
      const reason = email.reason || 'Unbekannt';
      if (!reports[reason]) {
        reports[reason] = { reason, total: 0, open: 0, inProgress: 0, closed: 0, negative: 0 };
      }
      reports[reason].total++;
      if (email.status === EmailStatus.OPEN) reports[reason].open++;
      if (email.status === EmailStatus.IN_PROGRESS) reports[reason].inProgress++;
      if (email.status === EmailStatus.CLOSED) reports[reason].closed++;
      if (email.sentiment === Sentiment.NEGATIVE) reports[reason].negative++;
    });

    return Object.values(reports).sort((a, b) => b.negative - a.negative);
  }, [emails]);

  const productReports = useMemo(() => {
    const reports: Record<string, { product: string, total: number, open: number, inProgress: number, closed: number, negative: number }> = {};
    
    emails.forEach(email => {
      const products = Array.isArray(email.product) ? email.product : [email.product || 'Unbekannt'];
      
      products.forEach(prod => {
        const product = prod || 'Unbekannt';
        if (!reports[product]) {
          reports[product] = { product, total: 0, open: 0, inProgress: 0, closed: 0, negative: 0 };
        }
        reports[product].total++;
        if (email.status === EmailStatus.OPEN) reports[product].open++;
        if (email.status === EmailStatus.IN_PROGRESS) reports[product].inProgress++;
        if (email.status === EmailStatus.CLOSED) reports[product].closed++;
        if (email.sentiment === Sentiment.NEGATIVE) reports[product].negative++;
      });
    });

    return Object.values(reports).sort((a, b) => b.negative - a.negative);
  }, [emails]);

  const branchReportEmails = useMemo(() => {
    if (!emails || emails.length === 0) return {};
    return emails.reduce<Record<string, Email[]>>((acc, email) => {
      const key = email.branch || 'Unbekannt';
      if (!acc[key]) acc[key] = [];
      acc[key].push(email);
      return acc;
    }, {});
  }, [emails]);

  const categoryReportEmails = useMemo(() => {
    if (!emails || emails.length === 0) return {};
    return emails.reduce<Record<string, Email[]>>((acc, email) => {
      const key = email.category || 'Unbekannt';
      if (!acc[key]) acc[key] = [];
      acc[key].push(email);
      return acc;
    }, {});
  }, [emails]);

  const reasonReportEmails = useMemo(() => {
    if (!emails || emails.length === 0) return {};
    return emails.reduce<Record<string, Email[]>>((acc, email) => {
      const key = email.reason || 'Unbekannt';
      if (!acc[key]) acc[key] = [];
      acc[key].push(email);
      return acc;
    }, {});
  }, [emails]);

  const productReportEmails = useMemo(() => {
    if (!emails || emails.length === 0) return {};
    return emails.reduce<Record<string, Email[]>>((acc, email) => {
      const products = Array.isArray(email.product) ? email.product : [email.product || 'Unbekannt'];
      products.forEach(prod => {
        const key = prod || 'Unbekannt';
        if (!acc[key]) acc[key] = [];
        acc[key].push(email);
      });
      return acc;
    }, {});
  }, [emails]);

  const kundenVsFiliale = useMemo(() => {
    let kunden = 0;
    let filialen = 0;

    for (const email of statsEmails) {
      if (email.branch && email.branch.trim() !== '') {
        filialen++;
      } else {
        kunden++;
      }
    }

    return [
      { name: 'Kunde', value: kunden },
      { name: 'Filiale', value: filialen }
    ];
  }, [statsEmails]);

  const todaysOverview = useMemo(() => {
    const now = new Date();

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const branchCounts: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};

    const source = statsRange === 'today'
      ? statsEmails.filter(email => {
          if (!email.date) return false;
          return isSameDay(new Date(email.date), now);
        })
      : statsEmails;

    for (const email of source) {
      const branch = (email.branch || 'Ohne Filiale').trim();
      const reason = (email.reason || email.category || 'Ohne Grund').trim();

      branchCounts[branch] = (branchCounts[branch] || 0) + 1;
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }

    const toSortedArray = (counts: Record<string, number>) =>
      Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
      branches: toSortedArray(branchCounts),
      reasons: toSortedArray(reasonCounts),
    };
  }, [statsEmails, statsRange]);

  const productStats = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const email of statsEmails) {
      const product = (email.product || 'Ohne Produkt').trim();
      if (!product) continue;
      counts[product] = (counts[product] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [statsEmails]);

  const monthlyTrend = useMemo(() => {
    const bucket: Record<string, { key: string; label: string; count: number; date: Date }> = {};

    for (const email of statsEmails) {
      if (!email.date) continue;

      const d = new Date(email.date);
      if (isNaN(d.getTime())) continue;

      // Monat + Jahr als Schlüssel
      const year = d.getFullYear();
      const month = d.getMonth(); // 0–11
      const key = `${year}-${month}`;

      // Label z.B. "Jan. 26"
      const label = d.toLocaleDateString('de-DE', {
        month: 'short',
        year: '2-digit',
      });

      if (!bucket[key]) {
        bucket[key] = { key, label, count: 0, date: d };
      }

      bucket[key].count += 1;
    }

    return Object.values(bucket)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [statsEmails]);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const triggerImportDialog = () => {
    importInputRef.current?.click();
  };

  const handleExportJson = () => {
    try {
      const data = JSON.stringify(emails, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'reklamationen-export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim Exportieren der JSON-Datei', error);
      alert('Beim Export ist ein Fehler aufgetreten.');
    }
  };

  const mapComplaintRecordToEmail = (record: any): Email => {
    const sentimentMap: Record<string, Sentiment> = {
      positiv: Sentiment.POSITIVE,
      neutral: Sentiment.NEUTRAL,
      negativ: Sentiment.NEGATIVE
    };

    const sentiment =
      sentimentMap[(record.sentiment as string)?.toLowerCase?.()] ?? Sentiment.NEUTRAL;

    const id =
      record.id ??
      (typeof crypto !== 'undefined' && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

    const content =
      record.rawBody && record.rawBody.trim() !== ''
        ? record.rawBody
        : record.summary ?? '';

    const imageLinks: string[] = [];

    if (content) {
      const regex = /(https?:\/\/\S+|\/geteilte-inhalte\/\S+)/g;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        imageLinks.push(match[0]);
      }
    }

    return {
      id,
      from: record.sender ?? 'Unbekannt',
      to: '',
      subject: record.subject ?? 'Kein Betreff',
      date: record.date ?? '',
      body: content,
      cleanBody: content,
      summary: record.summary ?? content,
      sentiment,
      category: record.category ?? 'Unbekannt',
      product: record.product ?? 'Unbekannt',
      branch: record.branch ?? '',
      reason: record.category ?? 'Unbekannt',
      images: imageLinks,
      employeeId: undefined,
      employeeName: undefined,
      // Importierte Datensätze aus JSON gelten als bereits bearbeitet:
      status: EmailStatus.CLOSED
    };
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          alert('Die JSON-Datei hat ein unerwartetes Format.');
          return;
        }

        const items = parsed as any[];
        if (items.length === 0) {
          alert('Die JSON-Datei enthält keine E-Mails.');
          return;
        }

        const first = items[0];
        let mapped: Email[] = [];

        const looksLikeEmail =
          first && typeof first === 'object' && ('from' in first || 'status' in first);
        const looksLikeComplaintRecord =
          first && typeof first === 'object' && 'sender' in first && 'rawBody' in first;

        if (looksLikeEmail) {
          // Direkt als Email[] übernehmen
          mapped = items as Email[];
        } else if (looksLikeComplaintRecord) {
          // Backwaren-/Lukas-Format in Email mappen
          mapped = items.map(mapComplaintRecordToEmail);
        } else {
          alert('Die JSON-Datei hat ein unbekanntes Format und konnte nicht zugeordnet werden.');
          return;
        }

        const importedCount = mapped.length;
        if (importedCount === 0) {
          alert('Die JSON-Datei enthält keine E-Mails.');
          return;
        }

        setEmails(prev => [...prev, ...mapped]);
        alert(`${importedCount} E-Mails erfolgreich importiert.`);
      } catch (error) {
        console.error('Fehler beim Importieren der JSON-Datei', error);
        alert('Die JSON-Datei konnte nicht gelesen werden.');
      } finally {
        // Input zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };
  
  const handleLoadDemoData = () => {
    const demoEmails = getDemoEmails();
    const alreadyHasDemo = emails.some(e => e.isDemo);
    if (alreadyHasDemo) {
      alert('Demo-Daten sind bereits geladen.');
      return;
    }
    setEmails(prev => [...prev, ...demoEmails]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const totalFiles = files.length;
    setUploadState({ status: 'uploading', total: totalFiles, processed: 0 });

    const processFile = (file: File): Promise<void> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const content = e.target?.result as string;
            const analysis = await analyzeEmail(content);
            const images = extractImagesFromRaw(content);
            const newEmail: Email = {
              id: Math.random().toString(36).substring(2, 11).toUpperCase(),
              from: analysis.from || "Unbekannt",
              to: analysis.to || "Zentrale",
              subject: analysis.subject || file.name,
              date: analysis.date || new Date().toISOString(),
              body: analysis.cleanBody || analysis.summary || "",
              summary: analysis.summary,
              cleanBody: analysis.cleanBody,
              sentiment: analysis.sentiment,
              category: analysis.category,
              product: analysis.product,
              branch: analysis.branch,
              reason: analysis.reason,
              images: images,
              employeeId: analysis.employeeId,
              employeeName: analysis.employeeName,
              status: EmailStatus.OPEN
            };
            setEmails(prev => [newEmail, ...prev]);
            setIsAiAvailable(true);
            setAiErrorCode(null);
          } catch (err: any) {
            console.error("Error processing file", file.name, err);
            if (err.code === "MISSING_API_KEY" || err.code === "AI_REQUEST_FAILED" || err.code === "TEMPORARY_UNAVAILABLE") {
              setIsAiAvailable(false);
              setAiErrorCode(err.code);
              
              // Bei temporärer Überlastung nach 60 Sek. automatisch reaktivieren
              if (err.code === "TEMPORARY_UNAVAILABLE") {
                setTimeout(() => {
                  setIsAiAvailable(true);
                  setAiErrorCode(null);
                }, 60000);
              }
            }
          } finally {
            setUploadState(prev => ({ ...prev, processed: prev.processed + 1 }));
            resolve();
          }
        };
        reader.readAsText(file);
      });
    };

    for (let i = 0; i < totalFiles; i++) {
      await processFile(files[i]);
    }

    setUploadState(prev => ({ ...prev, status: 'done' }));
    setTimeout(() => {
      setUploadState({ status: 'idle', total: 0, processed: 0 });
    }, 3000);
  };

  const updateStatus = (id: string, s: EmailStatus) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: s } : e));
    if (selectedEmail?.id === id) setSelectedEmail(prev => prev ? { ...prev, status: s } : null);
    setPendingStatus(null);
    setIsStatusDropdownOpen(false);
  };

  const updateSentiment = (id: string, s: Sentiment) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, sentiment: s } : e));
    if (selectedEmail?.id === id) setSelectedEmail(prev => prev ? { ...prev, status: s } : null);
    setPendingSentiment(null);
    setIsSentimentDropdownOpen(false);
  };

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    setShowOriginal(false);
    setIsStatusDropdownOpen(false);
    setPendingStatus(null);
    setIsSentimentDropdownOpen(false);
    setPendingSentiment(null);
    setView('detail'); 
  };

  const handleOpenFullDetail = () => {
    setView('detail');
  };

  const handleBackToList = () => {
    setView('list');
  };

  // Navigationsfunktion für Statistik-Kacheln
  const enterStatisticsDetail = (type: 'status' | 'sentiment', value: string) => {
    setStatisticsFilterType(type);
    setStatisticsFilterValue(value);
    setStatisticsMode('detail');
    setView('list');
  };

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      setZoomedImage(src);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const progressPercentage = uploadState.total > 0 
    ? Math.round((uploadState.processed / uploadState.total) * 100) 
    : 0;

  const getStatisticsDetailTitle = () => {
    if (statisticsFilterType === 'status') {
      switch (statisticsFilterValue) {
        case 'all': return "Details – Gesamt";
        case 'open': return "Details – Offene Vorgänge";
        case 'in_progress': return "Details – Vorgänge in Arbeit";
        case 'closed': return "Details – Erledigte Vorgänge";
        default: return "Details – Status";
      }
    } else if (statisticsFilterType === 'sentiment') {
      switch (statisticsFilterValue) {
        case 'positive': return "Details – Positive Beschwerden";
        case 'neutral': return "Details – Neutrale Beschwerden";
        case 'negative': return "Details – Negative Beschwerden";
        default: return "Details – Sentiment";
      }
    }
    return "Details";
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-8 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2">
            <X className="w-8 h-8" />
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed" 
            className="max-w-full max-h-full rounded-2xl shadow-2xl animate-in zoom-in duration-300 pointer-events-none" 
          />
        </div>
      )}

      {uploadState.status === 'uploading' && (
        <div className="fixed bottom-10 right-10 z-[60] animate-in slide-in-from-bottom duration-500">
          <div className="bg-white p-6 rounded-[32px] shadow-2xl border border-slate-100 w-80 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Import läuft...</span>
              <span className="text-xs font-black text-rose-600">{progressPercentage}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-600 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Verarbeite E-Mail {uploadState.processed} von {uploadState.total}
            </p>
          </div>
        </div>
      )}

      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3 text-rose-600 overflow-hidden">
            <div className="bg-rose-50 p-2 rounded-xl shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <span className="text-lg font-bold tracking-tight truncate" title="KI E-Mail Beschwerde-Analyse Dashboard">
              KI E-Mail Beschwerde-Analyse Dashboard
            </span>
          </div>
          <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">Dashboard</p>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <button 
            onClick={() => { setActiveTab('stats'); setView('list'); setStatisticsMode('overview'); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'stats' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Statistiken</span>
          </button>

          <button 
            onClick={() => { setActiveTab('reports'); setView('list'); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'reports' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Berichte</span>
          </button>

          <button 
            onClick={() => { setActiveTab('inbox'); setView('list'); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'inbox' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Inbox className="w-5 h-5" />
            <span>Posteingang</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'inbox' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
              {stats.open}
            </span>
          </button>

          <div className="mt-8">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase mb-3">
              Datenverwaltung
            </p>
            <button
              type="button"
              onClick={handleExportJson}
              className="w-full flex items-center gap-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl px-3 py-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Exportieren (.json)</span>
            </button>
            <button
              type="button"
              onClick={triggerImportDialog}
              className="mt-1 w-full flex items-center gap-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl px-3 py-2 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Importieren (.json)</span>
            </button>
            <button
              type="button"
              onClick={handleLoadDemoData}
              className="mt-1 w-full flex items-center gap-3 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-2xl px-3 py-2 transition"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Demo-Daten laden</span>
            </button>
          </div>
        </nav>

        <div className="p-6">
          <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isAiAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-xs font-bold">{isAiAvailable ? 'KI-Analyse aktiv' : 'KI-Analyse deaktiviert'}</span>
              </div>
            </div>
            <TrendingUp className="absolute -bottom-4 -right-4 w-20 h-20 text-white opacity-5 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {!isAiAvailable && (
          <div className={`${aiErrorCode === "TEMPORARY_UNAVAILABLE" ? "bg-orange-50 border-orange-100" : "bg-amber-50 border-amber-100"} border-b p-4 flex items-center gap-4 animate-in slide-in-from-top duration-500 shrink-0`}>
            <div className={`${aiErrorCode === "TEMPORARY_UNAVAILABLE" ? "bg-orange-100" : "bg-amber-100"} p-2 rounded-xl`}>
              <AlertTriangle className={`w-5 h-5 ${aiErrorCode === "TEMPORARY_UNAVAILABLE" ? "text-orange-600" : "text-amber-600"}`} />
            </div>
            <div>
              <h4 className={`text-sm font-black uppercase tracking-tight ${aiErrorCode === "TEMPORARY_UNAVAILABLE" ? "text-orange-900" : "text-amber-900"}`}>
                {aiErrorCode === "MISSING_API_KEY" ? "KI-Analyse deaktiviert" : 
                 aiErrorCode === "TEMPORARY_UNAVAILABLE" ? "KI vorübergehend nicht verfügbar" : 
                 "KI-Analyse fehlgeschlagen"}
              </h4>
              <p className={`text-xs font-medium mt-0.5 ${aiErrorCode === "TEMPORARY_UNAVAILABLE" ? "text-orange-700" : "text-amber-700"}`}>
                {aiErrorCode === "MISSING_API_KEY" 
                  ? "Es ist kein GEMINI_API_KEY konfiguriert. Bitte hinterlegen Sie einen gültigen API-Schlüssel in der Umgebungsvariable, um die KI-Funktionen zu aktivieren."
                  : aiErrorCode === "TEMPORARY_UNAVAILABLE"
                  ? "Die KI ist aktuell stark ausgelastet. Bitte versuchen Sie es in 1–2 Minuten erneut."
                  : "Die KI-Analyse konnte nicht durchgeführt werden. Bitte prüfen Sie Ihre Verbindung oder versuchen Sie es später erneut."}
              </p>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'inbox' && view === 'list' && (
          <div className="w-[450px] bg-white border-r border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-slate-100 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="E-Mails durchsuchen..." 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/20 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(['All', EmailStatus.OPEN, EmailStatus.IN_PROGRESS, EmailStatus.CLOSED] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s); setFilterSentiment('All'); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${filterStatus === s && filterSentiment === 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {s === 'All' ? 'Alle' : s === EmailStatus.OPEN ? 'Neu' : s === EmailStatus.IN_PROGRESS ? 'In Arbeit' : 'Erledigt'}
                  </button>
                ))}
              </div>

              <div className="relative">
                <label className={`flex items-center justify-center gap-3 w-full py-3.5 ${uploadState.status === 'uploading' || !isAiAvailable ? 'bg-slate-400 cursor-not-allowed opacity-80' : 'bg-rose-600 hover:bg-rose-700 active:scale-95 cursor-pointer'} text-white rounded-2xl text-sm font-bold transition-all shadow-xl shadow-rose-100`}>
                  <FileUp className="w-5 h-5" />
                  <span>
                    {uploadState.status === 'uploading' 
                      ? 'Import läuft...' 
                      : aiErrorCode === "TEMPORARY_UNAVAILABLE" 
                      ? 'KI überlastet (Warten...)' 
                      : 'E-Mail importieren'}
                  </span>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                    accept=".eml,.msg" 
                    disabled={uploadState.status === 'uploading' || !isAiAvailable} 
                    multiple 
                  />
                </label>
                {!isAiAvailable && (
                  <p className={`text-[10px] font-bold text-center mt-2 animate-in fade-in duration-500 ${aiErrorCode === "TEMPORARY_UNAVAILABLE" ? "text-orange-600" : "text-amber-600"}`}>
                    {aiErrorCode === "MISSING_API_KEY" ? "KI-Analyse deaktiviert" : "KI-Analyse vorübergehend gesperrt"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
              {filteredEmails.map(email => (
                <div 
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={`p-6 cursor-pointer transition-all hover:bg-slate-50/50 relative group ${selectedEmail?.id === email.id ? 'bg-rose-50/50 border-l-4 border-l-rose-600' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <StatusBadge status={email.status} />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {new Date(email.date).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug mb-2 group-hover:text-rose-600 transition-colors">
                    {email.subject}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <SentimentDot sentiment={email.sentiment} />
                      <span className="text-[11px] font-bold text-slate-500">{sentimentLabels[email.sentiment]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                      <Building className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{email.branch}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 bg-slate-50/50 overflow-y-auto custom-scrollbar relative">
          
          {view === 'detail' && selectedEmail && (
            <EmailDetailView 
              email={selectedEmail}
              onBack={handleBackToList}
              context="inbox"
              onUpdateStatus={updateStatus}
              onUpdateSentiment={updateSentiment}
            />
          )}

          {activeTab === 'inbox' && view === 'list' && selectedEmail && (
            <div className="h-full flex flex-col p-10 animate-in fade-in duration-300">
              <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/20 flex flex-col overflow-hidden max-h-full">
                <div className="p-8 border-b border-slate-50 space-y-4">
                  <div className="flex flex-col gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="flex justify-between">
                      <span>VON: {selectedEmail.from}</span>
                      <span>{new Date(selectedEmail.date).toLocaleDateString('de-DE')}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-2">
                      <span>AN: {selectedEmail.to || 'Zentrale'}</span>
                      <span className="text-rose-500">#{selectedEmail.id}</span>
                    </div>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 leading-tight line-clamp-2">
                    {selectedEmail.subject}
                  </h1>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Kategorie', value: selectedEmail.category, icon: Tag },
                      { label: 'Produkt', value: selectedEmail.product, icon: Utensils },
                      { label: 'Filiale', value: selectedEmail.branch, icon: Building },
                      { label: 'Mitarbeiter', value: selectedEmail.employeeName || 'N/A', icon: User }
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                        <item.icon className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.label}</p>
                          <p className="text-xs font-bold text-slate-800 truncate">{item.value || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">KI-Vorschau</h4>
                    <div className="p-5 bg-rose-50/30 rounded-2xl border border-rose-100/30 relative overflow-hidden">
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-5 font-medium italic">
                        {selectedEmail.summary || "Die Analyse konnte nicht vollständig durchgeführt werden."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/30 border-t border-slate-100 mt-auto shrink-0 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={selectedEmail.status} />
                      <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-lg border border-slate-100">
                        <SentimentDot sentiment={selectedEmail.sentiment} />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{sentimentLabels[selectedEmail.sentiment]}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleOpenFullDetail}
                      className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center gap-2 active:scale-95"
                    >
                      <span>Details anzeigen</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inbox' && !selectedEmail && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 text-slate-200">
                <Mail className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Posteingang leer</h3>
            </div>
          )}

          {activeTab === 'stats' && view === 'list' && (
            <div className="w-full max-w-[1600px] mx-auto px-10 xl:px-12 py-10 space-y-10 animate-in fade-in duration-500">
              {statisticsMode === 'overview' ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Statistiken</h1>
                      {emails.some(e => e.isDemo) && (
                        <div className="mt-2 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Demo-Daten aktiv – alle Werte dienen nur zu Demonstrationszwecken.</span>
                        </div>
                      )}
                      <p className="mt-1 text-sm text-slate-500 font-bold">
                        Überblick über alle eingegangenen Kunden-E-Mails.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 bg-white border-2 border-rose-300 rounded-full px-3 py-1.5 shadow-sm">
                      <span className="text-[10px] font-semibold tracking-[0.16em] text-rose-400 uppercase">
                        Zeitraum
                      </span>
                      <select
                        value={statsRange}
                        onChange={(e) => setStatsRange(e.target.value as StatsRange)}
                        className="bg-transparent border-none outline-none text-xs font-semibold text-slate-800 pr-4 cursor-pointer"
                      >
                        <option value="today">Heute</option>
                        <option value="last7">Letzte 7 Tage</option>
                        <option value="last30">Letzte 30 Tage</option>
                        <option value="all">Gesamter Zeitraum</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 2xl:gap-10 mt-8">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 xl:p-8 min-h-[520px] flex flex-col gap-6">
                      <div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Filter className="w-4 h-4 text-rose-600" />
                          {statsRange === 'today' ? 'Heutige Verteilung' : 'Verteilung (Zeitraum)'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Filialen und Gründe auf Basis der {statsRange === 'today' ? 'heutigen' : 'gefilterten'} E-Mails.
                        </p>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Filialen
                        </span>
                      </div>
                      <div className="mt-2 h-40">
                        {todaysOverview.branches.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            {statsRange === 'today' ? 'Keine Daten für heute.' : 'Keine Daten im gewählten Zeitraum.'}
                          </p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={todaysOverview.branches}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <Tooltip />
                              <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Gründe
                        </span>
                      </div>
                      <div className="mt-2 h-40">
                        {todaysOverview.reasons.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            {statsRange === 'today' ? 'Keine Daten für heute.' : 'Keine Daten im gewählten Zeitraum.'}
                          </p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={todaysOverview.reasons}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <Tooltip />
                              <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#f97316" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 xl:p-8 min-h-[520px] flex flex-col gap-6">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-rose-600" />
                        Kunden vs Filiale
                      </h3>
                      <div className="mt-4 space-y-6">
                        {/* Block 1: Donut + Legende */}
                        <div className="flex flex-col items-start">
                          <div className="h-44 w-full flex items-center justify-start">
                            <div className="mt-6 h-56 w-full">
                              {kundenVsFiliale.every(d => d.value === 0) ? (
                                <p className="text-xs text-slate-400">
                                  Noch keine Daten vorhanden.
                                </p>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={kundenVsFiliale}
                                      dataKey="value"
                                      nameKey="name"
                                      innerRadius={60}
                                      outerRadius={90}
                                    >
                                      <Cell fill="#6366F1" />   {/* Kunde */}
                                      <Cell fill="#10B981" />   {/* Filiale */}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </div>
                          <div className="mt-6 flex items-center gap-6 text-xs font-semibold text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              Kunde
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Filiale
                            </div>
                          </div>
                        </div>

                        {/* Block 2: Produkte */}
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Produkte
                          </span>
                          <div className="mt-2 h-40">
                            {productStats.length === 0 ? (
                              <p className="text-xs text-slate-400">
                                Keine Produktdaten vorhanden.
                              </p>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productStats}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                  <Tooltip />
                                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#8b5cf6" />
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 xl:p-8 min-h-[360px]">
                    <div>
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                        Reklamationsverlauf (pro Monat)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Zeigt, wie viele Reklamationen pro Monat eingegangen sind.
                      </p>
                    </div>

                    {monthlyTrend.length === 0 ? (
                      <p className="mt-8 text-xs text-slate-400">
                        Noch keine Daten vorhanden.
                      </p>
                    ) : (
                      <div className="mt-10">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => setStatisticsMode('overview')}
                      className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Zurück zur Übersicht
                    </button>
                    <div className="flex justify-between items-center">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        {getStatisticsDetailTitle()}
                      </h2>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">FILTER:</span>
                        <div className="relative group">
                          <select 
                            value={statisticsFilterValue || ''}
                            onChange={(e) => setStatisticsFilterValue(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 rounded-full px-6 py-2.5 text-xs font-bold text-slate-700 hover:border-rose-300 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all cursor-pointer pr-12 min-w-[160px] shadow-sm"
                          >
                            {statisticsFilterType === 'status' ? (
                              <>
                                <option value="all">Gesamt</option>
                                <option value="open">Offen</option>
                                <option value="in_progress">In Arbeit</option>
                                <option value="closed">Erledigt</option>
                              </>
                            ) : (
                              <>
                                <option value="positive">Positiv</option>
                                <option value="neutral">Neutral</option>
                                <option value="negative">Negativ</option>
                              </>
                            )}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-rose-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden divide-y divide-slate-50">
                    {filteredStatsEmails.length > 0 ? (
                      filteredStatsEmails.map(email => (
                        <div 
                          key={email.id}
                          onClick={() => handleSelectEmail(email)}
                          className="p-8 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-all group"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-4">
                              <StatusBadge status={email.status} />
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {new Date(email.date).toLocaleDateString('de-DE')}
                              </span>
                              <span className="text-[10px] text-rose-500 font-black uppercase">#{email.id}</span>
                            </div>
                            <h3 className="font-bold text-base text-slate-800 group-hover:text-rose-600 transition-colors">
                              {email.subject}
                            </h3>
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <SentimentDot sentiment={email.sentiment} />
                                <span className="text-[11px] font-bold text-slate-500">{sentimentLabels[email.sentiment]}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                <Building className="w-3.5 h-3.5" />
                                <span>{email.branch}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      ))
                    ) : (
                      <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="p-6 bg-slate-50 rounded-full">
                          <Inbox className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-bold text-sm">Keine E-Mails für diesen Filter gefunden.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="w-full max-w-7xl mx-auto px-8 py-8 space-y-12 animate-in fade-in duration-500">
              {reportView.mode === 'overview' && (
                <>
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Berichte</h2>
                      <p className="text-slate-500 font-bold text-sm">Auswertungen für Filialleitung und Management</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Neue KPI-Zeile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Gesamt
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                          {stats.total}
                        </span>
                      </div>
                      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Offen
                        </span>
                        <span className="text-2xl font-black text-rose-600">
                          {stats.open}
                        </span>
                      </div>
                      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          In Arbeit
                        </span>
                        <span className="text-2xl font-black text-amber-500">
                          {stats.inProgress}
                        </span>
                      </div>
                      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Erledigt
                        </span>
                        <span className="text-2xl font-black text-emerald-500">
                          {stats.done}
                        </span>
                      </div>
                    </div>

                    {/* Kleine Zusatzinfo zu Gründen und Filialen */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>
                        Gründe insgesamt:{' '}
                        <span className="font-semibold text-slate-900">
                          {stats.uniqueReasons}
                        </span>
                      </span>
                      <span>
                        Filialen mit Reklamationen:{' '}
                        <span className="font-semibold text-slate-900">
                          {stats.uniqueBranches}
                        </span>
                      </span>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-rose-50 rounded-2xl">
                          <Building className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Filialberichte</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zeigt eine Übersicht der Rückmeldungen je Filiale.</p>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="pb-4 pl-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Filiale</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gesamt</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Offen</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">In Arbeit</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Erledigt</th>
                              <th className="pb-4 pr-4 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">Negativ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {branchReports.map((report, idx) => (
                              <tr 
                                key={idx} 
                                className="hover:bg-rose-50 transition-colors group cursor-pointer"
                                onClick={() => setReportView({ mode: 'branch', branch: report.branch })}
                              >
                                <td className="py-4 pl-4 text-sm font-bold text-slate-800">{report.branch}</td>
                                <td className="py-4 text-sm font-bold text-slate-600 text-center">{report.total}</td>
                                <td className="py-4 text-sm font-bold text-rose-600 text-center">{report.open}</td>
                                <td className="py-4 text-sm font-bold text-orange-500 text-center">{report.inProgress}</td>
                                <td className="py-4 text-sm font-bold text-emerald-500 text-center">{report.closed}</td>
                                <td className="py-4 pr-4 text-sm font-black text-rose-600 text-center">{report.negative}</td>
                              </tr>
                            ))}
                            {branchReports.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-sm font-bold text-slate-400">Keine Daten verfügbar.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-rose-50 rounded-2xl">
                          <Tag className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Kategorienberichte</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hilft dabei, Problemfelder schnell zu erkennen.</p>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="pb-4 pl-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategorie</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gesamt</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Offen</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">In Arbeit</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Erledigt</th>
                              <th className="pb-4 pr-4 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">Negativ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {categoryReports.map((report, idx) => (
                              <tr 
                                key={idx} 
                                className="hover:bg-rose-50 transition-colors group cursor-pointer"
                                onClick={() => setReportView({ mode: 'category', category: report.category })}
                              >
                                <td className="py-4 pl-4 text-sm font-bold text-slate-800">{report.category}</td>
                                <td className="py-4 text-sm font-bold text-slate-600 text-center">{report.total}</td>
                                <td className="py-4 text-sm font-bold text-rose-600 text-center">{report.open}</td>
                                <td className="py-4 text-sm font-bold text-orange-500 text-center">{report.inProgress}</td>
                                <td className="py-4 text-sm font-bold text-emerald-500 text-center">{report.closed}</td>
                                <td className="py-4 pr-4 text-sm font-black text-rose-600 text-center">{report.negative}</td>
                              </tr>
                            ))}
                            {categoryReports.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-sm font-bold text-slate-400">Keine Daten verfügbar.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-rose-50 rounded-2xl">
                          <AlertTriangle className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Grundberichte</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zeigt eine Übersicht der häufigsten Reklamationsgründe.</p>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="pb-4 pl-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grund</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gesamt</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Offen</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">In Arbeit</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Erledigt</th>
                              <th className="pb-4 pr-4 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">Negativ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {reasonReports.map((report, idx) => (
                              <tr 
                                key={idx} 
                                className="hover:bg-rose-50 transition-colors group cursor-pointer"
                                onClick={() => setReportView({ mode: 'reason', reason: report.reason })}
                              >
                                <td className="py-4 pl-4 text-sm font-bold text-slate-800">{report.reason}</td>
                                <td className="py-4 text-sm font-bold text-slate-600 text-center">{report.total}</td>
                                <td className="py-4 text-sm font-bold text-rose-600 text-center">{report.open}</td>
                                <td className="py-4 text-sm font-bold text-orange-500 text-center">{report.inProgress}</td>
                                <td className="py-4 text-sm font-bold text-emerald-500 text-center">{report.closed}</td>
                                <td className="py-4 pr-4 text-sm font-black text-rose-600 text-center">{report.negative}</td>
                              </tr>
                            ))}
                            {reasonReports.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-sm font-bold text-slate-400">Keine Daten verfügbar.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-rose-50 rounded-2xl">
                          <Utensils className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Produktberichte</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zeigt eine Übersicht der Reklamationen je Produkt.</p>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="pb-4 pl-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produkt</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gesamt</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Offen</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">In Arbeit</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Erledigt</th>
                              <th className="pb-4 pr-4 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">Negativ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {productReports.map((report, idx) => (
                              <tr 
                                key={idx} 
                                className="hover:bg-rose-50 transition-colors group cursor-pointer"
                                onClick={() => setReportView({ mode: 'product', product: report.product })}
                              >
                                <td className="py-4 pl-4 text-sm font-bold text-slate-800">{report.product}</td>
                                <td className="py-4 text-sm font-bold text-slate-600 text-center">{report.total}</td>
                                <td className="py-4 text-sm font-bold text-rose-600 text-center">{report.open}</td>
                                <td className="py-4 text-sm font-bold text-orange-500 text-center">{report.inProgress}</td>
                                <td className="py-4 text-sm font-bold text-emerald-500 text-center">{report.closed}</td>
                                <td className="py-4 pr-4 text-sm font-black text-rose-600 text-center">{report.negative}</td>
                              </tr>
                            ))}
                            {productReports.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-sm font-bold text-slate-400">Keine Daten verfügbar.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {reportView.mode === 'branch' && (
                <ReportDetailView
                  title={`Reklamationsberichte – Filiale ${reportView.branch}`}
                  onBack={() => setReportView({ mode: 'overview' })}
                  emails={branchReportEmails[reportView.branch] || []}
                  onUpdateStatus={updateStatus}
                  onUpdateSentiment={updateSentiment}
                />
              )}

              {reportView.mode === 'category' && (
                <ReportDetailView
                  title={`Reklamationsberichte – Kategorie ${reportView.category}`}
                  onBack={() => setReportView({ mode: 'overview' })}
                  emails={categoryReportEmails[reportView.category] || []}
                  onUpdateStatus={updateStatus}
                  onUpdateSentiment={updateSentiment}
                />
              )}

              {reportView.mode === 'reason' && (
                <ReportDetailView
                  title={`Reklamationen mit Grund: ${reportView.reason}`}
                  onBack={() => setReportView({ mode: 'overview' })}
                  emails={reasonReportEmails[reportView.reason] || []}
                  onUpdateStatus={updateStatus}
                  onUpdateSentiment={updateSentiment}
                />
              )}

              {reportView.mode === 'product' && (
                <ReportDetailView
                  title={`Reklamationen zu Produkt: ${reportView.product}`}
                  onBack={() => setReportView({ mode: 'overview' })}
                  emails={productReportEmails[reportView.product] || []}
                  onUpdateStatus={updateStatus}
                  onUpdateSentiment={updateSentiment}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-left { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation-fill-mode: both; }
        .slide-in-from-left { animation: slide-in-left 0.3s ease-out; }
        .slide-in-from-left-4 { animation: slide-in-left-4 0.5s ease-out; }
        @keyframes slide-in-left-4 { from { transform: translateX(-1rem); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .slide-in-from-bottom { animation: fade-in 0.5s ease-out; }
        .fade-in { animation: fade-in 0.3s ease-out; }
        .zoom-in { animation: zoom-in 0.3s ease-out; }
        .email-body-content a { color: #e11d48; text-decoration: underline; font-weight: bold; }
        .email-body-content a:hover { color: #be123c; }
        .email-body-content p { margin-bottom: 1em; line-height: 1.6; }
        .email-body-content img { max-width: 100%; height: auto; border-radius: 1rem; margin: 1.5rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; display: block; }
        .email-body-content img:hover { transform: scale(1.01); transition: transform 0.2s ease; outline: 4px solid #fecdd3; }
        .cursor-zoom-out { cursor: zoom-out; }
      `}} />
      <input
        type="file"
        accept="application/json"
        ref={importInputRef}
        onChange={handleImportJson}
        className="hidden"
      />
    </div>
  );
};

export default App;
