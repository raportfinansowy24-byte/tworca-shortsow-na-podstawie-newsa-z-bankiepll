import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Table,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User as UserIcon,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  Send,
  Download,
  Upload,
  Calendar,
  Percent,
  TrendingUp,
  Eraser,
  X,
  FileCheck,
  Check,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogleDrive,
  getAccessToken
} from '../services/googleDriveService';
import {
  listSpreadsheets,
  getSpreadsheetMetadata,
  getSpreadsheetValues,
  appendSpreadsheetRows,
  clearSpreadsheetRange,
  deleteSpreadsheet,
  createSpreadsheet,
  createFinancialTemplateSpreadsheet,
  logVideoRenderToSheet,
  formatA1Range,
  FINANCIAL_TEMPLATES,
  SpreadsheetListItem,
  SpreadsheetMetadata,
  SpreadsheetValues
} from '../services/googleSheetsService';
import { JobStatusResponse, Scene } from '../types';

interface GoogleSheetsManagerProps {
  recentJobs?: JobStatusResponse[];
  onImportSceneHook?: (hook: string, title: string) => void;
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const GoogleSheetsManager: React.FC<GoogleSheetsManagerProps> = ({
  recentJobs = [],
  onImportSceneHook,
  onToast
}) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  // Spreadsheets list state
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetListItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active spreadsheet & tabs state
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [sheetMetadata, setSheetMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('');
  const [sheetValues, setSheetValues] = useState<SpreadsheetValues | null>(null);
  const [loadingValues, setLoadingValues] = useState<boolean>(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newSheetTitle, setNewSheetTitle] = useState<string>('');
  const [creatingSheet, setCreatingSheet] = useState<boolean>(false);

  // Add row form
  const [showAddRowForm, setShowAddRowForm] = useState<boolean>(false);
  const [newRowInputs, setNewRowInputs] = useState<string[]>(['', '', '', '', '']);
  const [appendingRow, setAppendingRow] = useState<boolean>(false);

  // Destructive Action Confirmation Modal (MANDATORY per Google Workspace Skill)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete_sheet' | 'clear_range';
    title: string;
    description: string;
    targetId?: string;
    targetRange?: string;
  }>({
    isOpen: false,
    type: 'delete_sheet',
    title: '',
    description: ''
  });
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  // Initialize auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthInitialized(true);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthInitialized(true);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch spreadsheets list once authenticated
  useEffect(() => {
    if (token) {
      loadSpreadsheetsList();
    } else {
      setSpreadsheets([]);
      setSelectedSheetId(null);
      setSheetMetadata(null);
      setSheetValues(null);
    }
  }, [token]);

  // Load active spreadsheet metadata and first tab data when selection changes
  useEffect(() => {
    if (selectedSheetId && token) {
      loadSpreadsheetDetails(selectedSheetId);
    }
  }, [selectedSheetId, token]);

  // Load values when active tab changes
  useEffect(() => {
    if (selectedSheetId && activeTabTitle && token) {
      loadTabValues(selectedSheetId, activeTabTitle);
    }
  }, [activeTabTitle]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        onToast?.('success', 'Zalogowano pomyślnie', `Połączono z kontem Google: ${result.user.email}`);
      }
    } catch (err: any) {
      console.error('Błąd logowania do Google:', err);
      onToast?.('error', 'Błąd logowania', err.message || 'Nie udało się połączyć z kontem Google Workspace.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogleDrive();
      setUser(null);
      setToken(null);
      setSelectedSheetId(null);
      setSheetMetadata(null);
      setSheetValues(null);
      setSpreadsheets([]);
      onToast?.('info', 'Wylogowano', 'Odłączono sesję Google Workspace.');
    } catch (err: any) {
      onToast?.('error', 'Błąd wylogowania', err.message);
    }
  };

  const loadSpreadsheetsList = async () => {
    setLoadingList(true);
    try {
      const files = await listSpreadsheets(searchQuery);
      setSpreadsheets(files);
      if (files.length > 0 && !selectedSheetId) {
        setSelectedSheetId(files[0].id);
      }
    } catch (err: any) {
      console.error('Błąd pobierania arkuszy:', err);
      onToast?.('error', 'Błąd Google Sheets', err.message || 'Nie udało się pobrać listy arkuszy.');
    } finally {
      setLoadingList(false);
    }
  };

  const loadSpreadsheetDetails = async (sheetId: string) => {
    setLoadingValues(true);
    try {
      const meta = await getSpreadsheetMetadata(sheetId);
      setSheetMetadata(meta);
      if (meta.sheets && meta.sheets.length > 0) {
        const firstTab = meta.sheets[0].properties.title;
        setActiveTabTitle(firstTab);
      } else {
        setSheetValues(null);
      }
    } catch (err: any) {
      console.error('Błąd pobierania metadanych arkusza:', err);
      onToast?.('error', 'Błąd arkusza', err.message || 'Nie udało się załadować zawartości arkusza.');
    } finally {
      setLoadingValues(false);
    }
  };

  const loadTabValues = async (sheetId: string, tabTitle: string) => {
    setLoadingValues(true);
    try {
      const range = formatA1Range(tabTitle, 'A1:Z100');
      const data = await getSpreadsheetValues(sheetId, range);
      setSheetValues(data);
    } catch (err: any) {
      console.error(`Błąd pobierania danych z "${tabTitle}":`, err);
      setSheetValues(null);
      onToast?.('error', 'Błąd danych arkusza', err.message || `Nie udało się pobrać zawartości zakładki "${tabTitle}".`);
    } finally {
      setLoadingValues(false);
    }
  };

  const handleCreateCustomSheet = async () => {
    if (!newSheetTitle.trim()) {
      onToast?.('warning', 'Brak nazwy', 'Podaj nazwę nowego arkusza kalkulacyjnego.');
      return;
    }

    setCreatingSheet(true);
    try {
      const created = await createSpreadsheet(newSheetTitle.trim(), [
        {
          title: 'Dane Finansowe',
          headers: ['Data', 'Kategoria', 'Wartość / Kwota', 'Status', 'Notatki'],
          starterRows: [
            [new Date().toISOString().slice(0, 10), 'Inwestycje / Raport', '1000 PLN', 'Aktywne', 'Przykładowy wiersz startowy']
          ]
        }
      ]);

      onToast?.('success', 'Utworzono arkusz', `Nowy arkusz "${newSheetTitle}" został zapisany na Twoim Dysku Google.`);
      setNewSheetTitle('');
      setShowCreateModal(false);
      await loadSpreadsheetsList();
      setSelectedSheetId(created.spreadsheetId);
    } catch (err: any) {
      onToast?.('error', 'Błąd tworzenia arkusza', err.message);
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleCreateTemplate = async (templateKey: keyof typeof FINANCIAL_TEMPLATES) => {
    setCreatingSheet(true);
    try {
      const template = FINANCIAL_TEMPLATES[templateKey];
      const created = await createFinancialTemplateSpreadsheet(templateKey);
      onToast?.('success', 'Szablon zainstalowany', `Utworzono arkusz: "${template.title}".`);
      setShowCreateModal(false);
      await loadSpreadsheetsList();
      setSelectedSheetId(created.spreadsheetId);
    } catch (err: any) {
      onToast?.('error', 'Błąd instalacji szablonu', err.message);
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleAppendRow = async () => {
    if (!selectedSheetId || !activeTabTitle) return;
    const cleanInputs = newRowInputs.filter((val) => val.trim() !== '');
    if (cleanInputs.length === 0) {
      onToast?.('warning', 'Puste pola', 'Wprowadź przynajmniej jedną wartość do nowego wiersza.');
      return;
    }

    setAppendingRow(true);
    try {
      await appendSpreadsheetRows(selectedSheetId, formatA1Range(activeTabTitle, 'A1'), [newRowInputs]);
      onToast?.('success', 'Dodano wiersz', `Nowy rekord został dopisany do zakładki "${activeTabTitle}".`);
      setNewRowInputs(['', '', '', '', '']);
      setShowAddRowForm(false);
      await loadTabValues(selectedSheetId, activeTabTitle);
    } catch (err: any) {
      onToast?.('error', 'Błąd zapisu wiersza', err.message);
    } finally {
      setAppendingRow(false);
    }
  };

  const handleSyncRecentJobs = async () => {
    if (!selectedSheetId || !activeTabTitle) return;
    if (recentJobs.length === 0) {
      onToast?.('info', 'Brak zadań renderu', 'Brak lokalnych zadań wideo do zsynchronizowania.');
      return;
    }

    setAppendingRow(true);
    try {
      let added = 0;
      for (const job of recentJobs) {
        if (job.status === 'completed') {
          await logVideoRenderToSheet(selectedSheetId, activeTabTitle, {
            title: job.jobId || 'AI Viral Shorts',
            duration: 18,
            sceneCount: 2,
            voice: 'pl-PL-MarekNeural',
            jobId: job.jobId,
            status: 'Wyrenderowane (Zakończone)',
            videoUrl: job.videoUrl
          });
          added++;
        }
      }

      if (added > 0) {
        onToast?.('success', 'Synchronizacja zakończona', `Dodano ${added} rekord(ów) wyrenderowanych filmów do arkusza.`);
        await loadTabValues(selectedSheetId, activeTabTitle);
      } else {
        onToast?.('info', 'Brak ukończonych zadań', 'Tylko zakończone rendery są synchronizowane.');
      }
    } catch (err: any) {
      onToast?.('error', 'Błąd synchronizacji', err.message);
    } finally {
      setAppendingRow(false);
    }
  };

  // Execution of Destructive Operations after Explicit User Confirmation (MANDATORY)
  const handleExecuteDestructiveAction = async () => {
    setActionInProgress(true);
    try {
      if (confirmModal.type === 'delete_sheet' && confirmModal.targetId) {
        await deleteSpreadsheet(confirmModal.targetId);
        onToast?.('success', 'Usunięto arkusz', 'Plik arkusza został trwale usunięty z Dysku Google.');
        setConfirmModal({ isOpen: false, type: 'delete_sheet', title: '', description: '' });
        setSelectedSheetId(null);
        setSheetMetadata(null);
        setSheetValues(null);
        await loadSpreadsheetsList();
      } else if (confirmModal.type === 'clear_range' && selectedSheetId && confirmModal.targetRange) {
        await clearSpreadsheetRange(selectedSheetId, confirmModal.targetRange);
        onToast?.('success', 'Wyczyszczono dane', `Zakres "${confirmModal.targetRange}" został wyczyszczony.`);
        setConfirmModal({ isOpen: false, type: 'clear_range', title: '', description: '' });
        if (activeTabTitle) {
          await loadTabValues(selectedSheetId, activeTabTitle);
        }
      }
    } catch (err: any) {
      onToast?.('error', 'Błąd operacji', err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Helper for rendering table grid
  const renderDataGrid = () => {
    if (loadingValues) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm font-medium">Pobieranie wierszy z Google Sheets API v4...</p>
        </div>
      );
    }

    if (!sheetValues || !sheetValues.values || sheetValues.values.length === 0) {
      return (
        <div className="text-center py-16 text-slate-400 space-y-4">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-600" />
          <div>
            <p className="text-sm font-semibold text-slate-300">Ta zakładka arkusza jest obecnie pusta.</p>
            <p className="text-xs text-slate-500 mt-1">Dodaj pierwszy wiersz lub zsynchronizuj logi wyrenderowanych Shorts.</p>
          </div>
          <button
            onClick={() => setShowAddRowForm(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Dodaj wiersz danych
          </button>
        </div>
      );
    }

    const rows = sheetValues.values;
    const headerRow = rows[0] || [];
    const bodyRows = rows.slice(1);

    return (
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 shadow-inner">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
              <th className="py-2.5 px-3 w-10 text-center font-mono text-[10px] text-slate-500 border-r border-slate-800">
                #
              </th>
              {headerRow.map((cell, colIdx) => (
                <th
                  key={colIdx}
                  className="py-2.5 px-3 font-semibold text-emerald-300 tracking-wide border-r border-slate-800 last:border-r-0 whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{String(cell)}</span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {String.fromCharCode(65 + (colIdx % 26))}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {bodyRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-slate-900/60 transition-colors group"
              >
                <td className="py-2 px-3 text-center text-slate-500 text-[10px] border-r border-slate-800 bg-slate-950">
                  {rowIdx + 2}
                </td>
                {headerRow.map((_, colIdx) => {
                  const val = row[colIdx] !== undefined ? String(row[colIdx]) : '';
                  const isUrl = val.startsWith('http://') || val.startsWith('https://');

                  return (
                    <td
                      key={colIdx}
                      className="py-2 px-3 text-slate-200 border-r border-slate-800/50 last:border-r-0 max-w-[280px] truncate"
                      title={val}
                    >
                      {isUrl ? (
                        <a
                          href={val}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1 inline-flex"
                        >
                          <span className="truncate max-w-[200px]">{val}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span>{val || <span className="text-slate-600">—</span>}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Google Sheets — Raport Finansowy 24
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v4 API Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Dwukierunkowa synchronizacja arkuszy finansowych, kalendarza postów wideo i analityki renderów.
              </p>
            </div>
          </div>
        </div>

        {/* Auth / Account Profile */}
        <div className="flex items-center gap-3">
          {!user ? (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="relative flex items-center justify-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-md transition-all duration-150 active:scale-95 disabled:opacity-50"
              style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}
            >
              {isLoggingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              <span>Zaloguj przez Google</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-emerald-500/40"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="text-left text-xs">
                <div className="font-bold text-white truncate max-w-[140px]">
                  {user.displayName || 'Konto Google'}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {user.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition ml-1"
                title="Wyloguj konto Google"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {!user ? (
        /* Sign-in Callout */
        <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-4 max-w-xl mx-auto shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Połącz swój Dysk i Arkusze Google</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Uzyskaj bezpieczny dostęp do arkuszy kalkulacyjnych z pozwoleniem użytkownika. Twórz kalendarze publikacji, śledź oferty bankowe i loguj rendery wideo bezpośrednio z aplikacji.
            </p>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Zezwól na dostęp i połącz Google Sheets
          </button>
        </div>
      ) : (
        /* Authenticated Google Sheets Workspace View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Spreadsheets List & Creator */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  Twoje Arkusze ({spreadsheets.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadSpreadsheetsList()}
                    disabled={loadingList}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="Odśwież listę"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
                    title="Utwórz nowy arkusz"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadSpreadsheetsList()}
                  placeholder="Szukaj arkusza..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Spreadsheets List */}
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {loadingList ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-2" />
                    Ładowanie arkuszy...
                  </div>
                ) : spreadsheets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                    <p>Nie znaleziono arkuszy Google.</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="text-emerald-400 hover:underline text-[11px] font-semibold"
                    >
                      + Zainstaluj szablon finansowy
                    </button>
                  </div>
                ) : (
                  spreadsheets.map((sheet) => {
                    const isSelected = sheet.id === selectedSheetId;
                    return (
                      <div
                        key={sheet.id}
                        onClick={() => setSelectedSheetId(sheet.id)}
                        className={`group p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-sm'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileSpreadsheet
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'
                            }`}
                          />
                          <div className="overflow-hidden">
                            <div className="text-xs font-semibold truncate">{sheet.name}</div>
                            {sheet.modifiedTime && (
                              <div className="text-[10px] text-slate-500">
                                {new Date(sheet.modifiedTime).toLocaleDateString('pl-PL')}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action to create templates */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Szablony RaportFinansowy24
                </button>
              </div>
            </div>
          </div>

          {/* Right Main Area: Selected Spreadsheet Viewer & Operations */}
          <div className="lg:col-span-3 space-y-4">
            {sheetMetadata ? (
              <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                {/* Spreadsheet Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white flex items-center gap-2 truncate max-w-md">
                        {sheetMetadata.properties.title}
                      </h3>
                      {sheetMetadata.spreadsheetUrl && (
                        <a
                          href={sheetMetadata.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-emerald-400 transition"
                          title="Otwórz w nowej karcie Google Sheets"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ID: <span className="font-mono text-slate-500">{sheetMetadata.spreadsheetId}</span>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowAddRowForm((prev) => !prev)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Dodaj wiersz
                    </button>

                    <button
                      onClick={handleSyncRecentJobs}
                      disabled={appendingRow}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      title="Dopisuje wyrenderowane wideo z bieżącej sesji do tego arkusza"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Zsynchronizuj wideo ({recentJobs.filter((j) => j.status === 'completed').length})
                    </button>

                    <button
                      onClick={() => {
                        if (activeTabTitle) {
                          setConfirmModal({
                            isOpen: true,
                            type: 'clear_range',
                            title: `Wyczyścić zawartość zakładki "${activeTabTitle}"?`,
                            description: 'Operacja wyczyści dane w wybranej zakładce arkusza (zostaną zachowane nazwy kolumn i struktura).',
                            targetRange: formatA1Range(activeTabTitle, 'A2:Z100')
                          });
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/40 text-slate-400 hover:text-amber-400 border border-slate-700/80 transition"
                      title="Wyczyść dane z zakładki"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          type: 'delete_sheet',
                          title: `Usunąć arkusz "${sheetMetadata.properties.title}"?`,
                          description: 'Plik arkusza kalkulacyjnego zostanie trwale usunięty z Twojego Dysku Google. Tej operacji nie można cofnąć.',
                          targetId: sheetMetadata.spreadsheetId
                        });
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/80 transition"
                      title="Usuń ten arkusz z Dysku Google"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tabs / Worksheets Bar (Does NOT hardcode Sheet1!) */}
                <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                    <Layers className="w-3.5 h-3.5" /> Zakładki:
                  </span>
                  {sheetMetadata.sheets.map((tab) => {
                    const isTabActive = tab.properties.title === activeTabTitle;
                    return (
                      <button
                        key={tab.properties.sheetId}
                        onClick={() => setActiveTabTitle(tab.properties.title)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                          isTabActive
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <Table className="w-3 h-3" />
                        {tab.properties.title}
                        {tab.properties.gridProperties?.rowCount && (
                          <span className="text-[10px] opacity-75 font-mono">
                            ({tab.properties.gridProperties.rowCount} w.)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Optional Inline Add Row Drawer */}
                <AnimatePresence>
                  {showAddRowForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          Dopisz nowy wiersz do "{activeTabTitle}"
                        </h4>
                        <button
                          onClick={() => setShowAddRowForm(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                        {newRowInputs.map((val, idx) => {
                          const colLetter = String.fromCharCode(65 + idx);
                          const headerName =
                            sheetValues?.values?.[0]?.[idx] !== undefined
                              ? String(sheetValues.values[0][idx])
                              : `Kolumna ${colLetter}`;

                          return (
                            <div key={idx} className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-semibold truncate block">
                                {headerName} ({colLetter})
                              </label>
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => {
                                  const updated = [...newRowInputs];
                                  updated[idx] = e.target.value;
                                  setNewRowInputs(updated);
                                }}
                                placeholder={`Wartość...`}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setShowAddRowForm(false)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                        >
                          Anuluj
                        </button>
                        <button
                          onClick={handleAppendRow}
                          disabled={appendingRow}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 shadow-md"
                        >
                          {appendingRow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Zapisz do arkusza
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Table Grid View */}
                {renderDataGrid()}
              </div>
            ) : (
              <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-4">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-600" />
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Wybierz lub utwórz arkusz</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Wybierz arkusz z panelu po lewej stronie, aby przeglądać i edytować dane, lub skorzystaj z gotowych szablonów.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="w-4 h-4" />
                  Przeglądaj szablony finansowe
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Spreadsheet or Choose Financial Template */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Utwórz Nowy Arkusz Google</h3>
                    <p className="text-xs text-slate-400">Wybierz gotowy szablon finansowy lub stwórz czysty arkusz</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ready Financial Templates */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Szablony RaportFinansowy24 (Zalecane)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Calendar Template */}
                  <div
                    onClick={() => handleCreateTemplate('calendar')}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/60 hover:bg-emerald-950/20 cursor-pointer transition space-y-2 group"
                  >
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 w-fit">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Kalendarz Publikacji Shorts
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Harmonogram wideo, haczyki (hooki), platformy docelowe (TikTok/YT) i statusy.
                    </p>
                  </div>

                  {/* Rates Monitoring Template */}
                  <div
                    onClick={() => handleCreateTemplate('rates')}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/60 hover:bg-emerald-950/20 cursor-pointer transition space-y-2 group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Monitoring Kursów & RRSO
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Śledzenie stawek banków, promocji na lokatach i prowizji pod rzetelne treści.
                    </p>
                  </div>

                  {/* ROI & Job Logs Template */}
                  <div
                    onClick={() => handleCreateTemplate('jobs_roi')}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/60 hover:bg-emerald-950/20 cursor-pointer transition space-y-2 group"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 w-fit">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Logi Renderów & Analityka
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Dziennik wygenerowanych klipów FFmpeg, czasów trwania, identyfikatorów i linków.
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom blank sheet option */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Własny Arkusz Kalkulacyjny
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSheetTitle}
                    onChange={(e) => setNewSheetTitle(e.target.value)}
                    placeholder="Wpisz nazwę nowego arkusza..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleCreateCustomSheet}
                    disabled={creatingSheet || !newSheetTitle.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shrink-0"
                  >
                    {creatingSheet ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Utwórz pusty
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mandatory Destructive Action Confirmation Dialog */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Wymagane bezpośrednie potwierdzenie</p>
                </div>
              </div>

              <div className="p-3.5 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-200 leading-relaxed">
                {confirmModal.description}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false, type: 'delete_sheet', title: '', description: '' })}
                  disabled={actionInProgress}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDestructiveAction}
                  disabled={actionInProgress}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 shadow-lg transition disabled:opacity-50"
                >
                  {actionInProgress ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Tak, potwierdzam i wykonaj
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
