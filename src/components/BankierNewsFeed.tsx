import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Coins,
  Clock,
  Zap,
  Sparkles,
  Bot
} from 'lucide-react';
import { BankierArticle } from '../types';

interface BankierNewsFeedProps {
  selectedArticleId?: string | null;
  onSelectArticle?: (article: BankierArticle) => void;
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  processedUrls?: string[];
  candidateArticleLink?: string | null;
  onRunNowWithArticle?: (article: BankierArticle) => void;
}

export const BankierNewsFeed: React.FC<BankierNewsFeedProps> = ({
  selectedArticleId,
  onSelectArticle,
  onToast,
  processedUrls = [],
  candidateArticleLink,
  onRunNowWithArticle
}) => {
  const [category, setCategory] = useState<'wiadomosci' | 'gielda' | 'waluty'>('wiadomosci');
  const [articles, setArticles] = useState<BankierArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch authentic live RSS Feed directly from Bankier.pl
  const fetchRssNews = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = `/api/news/bankier?category=${category}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Nie udało się pobrać wiadomości z Bankier.pl');
      }

      setArticles(data.articles || []);
      if (data.lastUpdated) {
        const d = new Date(data.lastUpdated);
        setLastUpdated(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
      if (forceRefresh) {
        onToast?.('success', 'Wiadomości Bankier.pl', `Zaktualizowano najnowsze artykuły z Bankier.pl (${data.articles?.length || 0})`);
      }
    } catch (err) {
      console.warn('[Bankier RSS] Informacja o kanale:', err);
      if (forceRefresh) {
        onToast?.('warning', 'Bankier.pl', 'Sprawdź połączenie z kanałem informacyjnym.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRssNews(false);
  }, [category]);

  const filteredArticles = articles.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
  });

  return (
    <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-950/20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Newspaper className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Bankier.pl • Automatyczny Monitoring Rynkowy
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AUTONOMINICZNA KOLEJKA 4X NA DOBĘ
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Nie musisz klikać w wiadomości — system samoczynnie 4 razy na dobę (06:00, 11:00, 16:00, 21:00) wybiera najświeższy news i montuje gotowy film Short z lektorem.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {lastUpdated && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-slate-400" />
              {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchRssNews(true)}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
            title="Odśwież najświeższe wiadomości"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Odśwież kanał</span>
          </button>
        </div>
      </div>

      {/* Category Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 pb-2 border-b border-slate-900/60">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setCategory('wiadomosci')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              category === 'wiadomosci'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            Wiadomości ogólne
          </button>
          <button
            type="button"
            onClick={() => setCategory('gielda')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              category === 'gielda'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Giełda & GPW
          </button>
          <button
            type="button"
            onClick={() => setCategory('waluty')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              category === 'waluty'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Waluty & Forex
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj w nagłówkach..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
      </div>

      {/* Articles Grid */}
      <div className="mt-3">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs">
              Pobieranie najświeższego strumienia wiadomości z Bankier.pl...
            </span>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800/60">
            Nie znaleziono artykułów pasujących do zapytania &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredArticles.map((art, idx) => {
              const isCandidate = candidateArticleLink ? art.link === candidateArticleLink : idx === 0;
              const isProcessed = processedUrls.includes(art.link);
              const isSelected = selectedArticleId === art.id || selectedArticleId === art.title;

              return (
                <div
                  key={art.id}
                  className={`group relative p-3.5 rounded-xl border transition flex flex-col justify-between gap-3 ${
                    isCandidate
                      ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/20'
                      : isProcessed
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCandidate ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            NASTĘPNY W KOLEJCE (START 4X/DOBĘ)
                          </span>
                        ) : isProcessed ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            WYGENEROWANE WIDEO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-medium text-slate-400">
                            W buforze monitoringu
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] font-semibold text-amber-300">
                          {art.category || 'Finanse'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {art.formattedDate || art.pubDate}
                        </span>
                        <a
                          href={art.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition flex items-center gap-1 text-[10px]"
                          title="Otwórz oryginalny artykuł na Bankier.pl"
                        >
                          <span>Bankier.pl</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white group-hover:text-amber-200 transition line-clamp-2 leading-snug">
                      {art.title}
                    </h4>

                    {art.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {art.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                    <div className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Bot className="w-3 h-3 text-indigo-400" />
                      <span>{isCandidate ? 'Zostanie pobrany w najbliższym cyklu' : isProcessed ? 'Zmontowany w gotowy film' : 'Dostępny w monitorze'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onRunNowWithArticle && (
                        <button
                          type="button"
                          onClick={() => onRunNowWithArticle(art)}
                          className="px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-[10px] flex items-center gap-1 transition"
                          title="Uruchom montaż wideo dla tego konkretnego newsa"
                        >
                          <Zap className="w-3 h-3 text-amber-300" />
                          <span>Uruchom teraz</span>
                        </button>
                      )}
                      {onSelectArticle && (
                        <button
                          type="button"
                          onClick={() => onSelectArticle(art)}
                          className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? 'Podgląd aktywnego' : 'Podgląd'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
