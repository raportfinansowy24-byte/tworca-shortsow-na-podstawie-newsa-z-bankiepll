import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  Film,
  FileText,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  LogOut,
  User as UserIcon,
  Play,
  Plus,
  ArrowRight,
  Sparkles,
  Cloud,
  Check,
  Video
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogleDrive,
  listDriveFiles,
  getDriveStorageInfo,
  deleteDriveFile,
  createDriveFolder,
  getOrCreateAppFolder,
  exportVideoUrlToDrive,
  DriveFileItem,
  DriveStorageQuota
} from '../services/googleDriveService';
import { JobStatusResponse, Scene } from '../types';

interface GoogleDriveManagerProps {
  recentJobs?: JobStatusResponse[];
  onSelectVideoForScene?: (videoUrl: string, name: string) => void;
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({
  recentJobs = [],
  onSelectVideoForScene,
  onToast
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);

  // Drive Data State
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [storageInfo, setStorageInfo] = useState<DriveStorageQuota | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'folder'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderHistory, setFolderHistory] = useState<{ id?: string; name: string }[]>([
    { id: undefined, name: 'Mój Dysk' }
  ]);

  // Modals & Actions
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Upload status for rendered videos
  const [exportingJobId, setExportingJobId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [uploadedDriveLinks, setUploadedDriveLinks] = useState<Record<string, string>>({});

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, accessToken) => {
        setUser(authedUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Drive Files & Storage Info when token changes or folder changes
  const fetchDriveContent = async () => {
    if (needsAuth) return;
    setLoadingFiles(true);
    try {
      const [filesRes, storageRes] = await Promise.all([
        listDriveFiles({
          query: searchQuery,
          folderId: currentFolderId,
          mimeTypeFilter: filterType === 'all' ? undefined : filterType,
          pageSize: 30
        }),
        getDriveStorageInfo().catch(() => null)
      ]);

      setFiles(filesRes.files);
      if (storageRes) {
        setStorageInfo(storageRes);
      }
    } catch (err: any) {
      console.error('Błąd pobierania danych z Google Drive:', err);
      onToast?.('error', 'Błąd Google Drive', err.message || 'Nie udało się pobrać zawartości dysku.');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (!needsAuth && token) {
      fetchDriveContent();
    }
  }, [needsAuth, token, currentFolderId, filterType]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setNeedsAuth(false);
        onToast?.('success', 'Połączono z Google Drive', `Zalogowano jako ${res.user.displayName || res.user.email}`);
      }
    } catch (err: any) {
      console.error('Błąd logowania:', err);
      onToast?.('error', 'Logowanie nie powiodło się', err.message || 'Wystąpił problem podczas autoryzacji.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogleDrive();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setFiles([]);
      setStorageInfo(null);
      onToast?.('info', 'Wylogowano', 'Rozłączono z Google Drive.');
    } catch (err: any) {
      onToast?.('error', 'Błąd wylogowania', err.message);
    }
  };

  // Navigate into folder
  const handleOpenFolder = (folder: DriveFileItem) => {
    setCurrentFolderId(folder.id);
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  // Navigate breadcrumb
  const handleNavigateBreadcrumb = (index: number) => {
    const target = folderHistory[index];
    setCurrentFolderId(target.id);
    setFolderHistory((prev) => prev.slice(0, index + 1));
  };

  // Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await createDriveFolder(newFolderName.trim(), currentFolderId);
      onToast?.('success', 'Folder utworzony', `Utworzono folder "${newFolderName}" na Dysku Google.`);
      setNewFolderName('');
      setShowNewFolderModal(false);
      fetchDriveContent();
    } catch (err: any) {
      onToast?.('error', 'Błąd tworzenia folderu', err.message);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Delete File with Mandatory Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirmFile) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(deleteConfirmFile.id);
      onToast?.('success', 'Usunięto z Dysku', `Plik "${deleteConfirmFile.name}" został usunięty.`);
      setDeleteConfirmFile(null);
      fetchDriveContent();
    } catch (err: any) {
      onToast?.('error', 'Błąd usuwania pliku', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Rendered Video MP4 directly to Google Drive
  const handleExportJobToDrive = async (job: JobStatusResponse) => {
    if (!job.outputUrl) return;
    setExportingJobId(job.id);
    setExportProgress(10);
    try {
      // Find or create dedicated folder
      const targetFolderId = await getOrCreateAppFolder('Raport Finansowy 24 - Shorts');
      const filename = job.outputFilename || `Short_Video_${job.id.slice(0, 8)}.mp4`;

      const result = await exportVideoUrlToDrive({
        videoUrl: job.outputUrl,
        fileName: filename,
        folderId: targetFolderId,
        description: `Wideo wygenerowane przez Raport Finansowy 24 (Zadanie ID: ${job.id})`,
        onProgress: (pct) => setExportProgress(pct)
      });

      if (result.webViewLink) {
        setUploadedDriveLinks((prev) => ({ ...prev, [job.id]: result.webViewLink! }));
      }

      onToast?.(
        'success',
        'Zapisano na Dysku Google!',
        `Film "${result.name}" został pomyślnie zapisany w folderze "Raport Finansowy 24 - Shorts".`
      );
      fetchDriveContent();
    } catch (err: any) {
      onToast?.('error', 'Błąd zapisu na Dysk Google', err.message);
    } finally {
      setExportingJobId(null);
      setExportProgress(0);
    }
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '0 B';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const calculateUsagePercent = () => {
    if (!storageInfo?.limit || !storageInfo?.usage) return 0;
    const limit = parseInt(storageInfo.limit, 10);
    const usage = parseInt(storageInfo.usage, 10);
    if (!limit || limit === 0) return 0;
    return Math.min(100, Math.round((usage / limit) * 100));
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950 p-6 sm:p-8 rounded-3xl border border-sky-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold uppercase tracking-wider">
              <Cloud className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              Integracja Google Workspace (Google Drive)
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight flex items-center gap-3">
              <HardDrive className="w-7 h-7 text-sky-400" />
              Dysk Google & Eksport Wideo Shorts
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed">
              Połącz aplikację ze swoim Dyskiem Google, aby jednym kliknięciem eksportować wyrenderowane filmy MP4, tworzyć kopie zapasowe scenariuszy oraz wybierać własne materiały wideo z chmury jako tła dla Shortów.
            </p>
          </div>

          {/* User Sign In Card */}
          <div className="shrink-0">
            {needsAuth ? (
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col items-center text-center space-y-3">
                <p className="text-xs text-slate-300 max-w-[220px]">
                  Zaloguj się kontem Google, aby przeglądać pliki i zapisywać filmy.
                </p>

                {/* Official Google Sign In Button */}
                <button
                  type="button"
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
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3 min-w-[260px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Google User'}
                        className="w-9 h-9 rounded-full border border-sky-400/40"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white truncate max-w-[150px]">
                        {user?.displayName || 'Użytkownik Google'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {user?.email}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
                    title="Rozłącz konto"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Storage Quota bar */}
                {storageInfo?.limit && (
                  <div className="space-y-1 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Dysk: {formatBytes(storageInfo.usage)}</span>
                      <span>Z {formatBytes(storageInfo.limit)} ({calculateUsagePercent()}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-sky-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${calculateUsagePercent()}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Quick Export of Rendered Videos to Google Drive */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-sky-400" />
              Szybki Zapis Wyrenderowanych Wideo na Dysk Google
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Wyślij gotowe pliki MP4 z ostatnich zadań do dedykowanego folderu <strong>Raport Finansowy 24 - Shorts</strong> w Twojej chmurze.
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            {recentJobs.filter((j) => j.status === 'completed' && j.outputUrl).length} gotowych filmów
          </span>
        </div>

        {recentJobs.filter((j) => j.status === 'completed' && j.outputUrl).length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs space-y-2">
            <Film className="w-8 h-8 text-slate-600 mx-auto" />
            <p>Brak wyrenderowanych filmów MP4 w tej sesji.</p>
            <p className="text-[11px] text-slate-500">
              Wygeneruj film w zakładce <strong>AI Auto-Pilot</strong> lub <strong>Kreator Scen</strong>, a pojawi się tutaj opcja natychmiastowego eksportu do chmury.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentJobs
              .filter((j) => j.status === 'completed' && j.outputUrl)
              .slice(0, 6)
              .map((job) => {
                const isUploading = exportingJobId === job.id;
                const driveLink = uploadedDriveLinks[job.id];

                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Gotowy MP4
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ⏱️ {job.duration || 18}s
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white truncate" title={job.outputFilename || job.id}>
                        {job.outputFilename || `Short Video ${job.id.slice(0, 10)}.mp4`}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                      {driveLink ? (
                        <a
                          href={driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Otwórz na Dysku</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleExportJobToDrive(job)}
                          disabled={needsAuth || isUploading}
                          className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/40"
                        >
                          {isUploading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Wysyłanie ({exportProgress}%)...</span>
                            </>
                          ) : (
                            <>
                              <Cloud className="w-3.5 h-3.5" />
                              <span>Zapisz na Google Drive</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Section 2: Google Drive File Explorer & Browser */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        {/* Controls & Search Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            {folderHistory.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-600">/</span>}
                <button
                  type="button"
                  onClick={() => handleNavigateBreadcrumb(idx)}
                  className={`font-semibold hover:underline transition ${
                    idx === folderHistory.length - 1 ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewFolderModal(true)}
              disabled={needsAuth}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Nowy Folder</span>
            </button>

            <button
              type="button"
              onClick={fetchDriveContent}
              disabled={needsAuth || loadingFiles}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Odśwież pliki"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Wyszukaj pliki na Dysku Google..."
              disabled={needsAuth}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition text-center ${
                filterType === 'all' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Wszystkie
            </button>
            <button
              type="button"
              onClick={() => setFilterType('video')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                filterType === 'video' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" /> Wideo
            </button>
            <button
              type="button"
              onClick={() => setFilterType('folder')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                filterType === 'folder' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Folder className="w-3 h-3" /> Foldery
            </button>
          </div>
        </div>

        {/* Files Grid */}
        {needsAuth ? (
          <div className="py-16 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <Cloud className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">Połącz z Dyskiem Google</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Zaloguj się kontem Google powyżej, aby uzyskać bezpieczny dostęp do swoich materiałów wideo i folderów w chmurze.
            </p>
          </div>
        ) : loadingFiles ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-400 mx-auto" />
            <p className="text-xs text-slate-400">Pobieranie plików z Dysku Google...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-16 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            <Folder className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Brak plików w tym folderze</p>
            <p className="text-[11px] text-slate-500">
              Prześlij plik wideo lub utwórz nowy folder.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {files.map((file) => {
              const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
              const isVideo = file.mimeType.includes('video/');

              return (
                <div
                  key={file.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isFolder
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : isVideo
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {isFolder ? <Folder className="w-5 h-5" /> : isVideo ? <Film className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>

                    <div className="overflow-hidden flex-1 space-y-0.5">
                      {isFolder ? (
                        <button
                          type="button"
                          onClick={() => handleOpenFolder(file)}
                          className="text-xs font-bold text-white hover:text-sky-300 transition truncate text-left w-full block"
                          title={file.name}
                        >
                          {file.name}
                        </button>
                      ) : (
                        <div className="text-xs font-semibold text-white truncate" title={file.name}>
                          {file.name}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {file.size && <span>{formatBytes(file.size)}</span>}
                        {file.modifiedTime && (
                          <span>
                            {new Date(file.modifiedTime).toLocaleDateString('pl-PL', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-900 text-xs">
                    <div className="flex items-center gap-1">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-900 transition"
                          title="Otwórz na Dysku Google"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* If it is a video, allow using as scene background */}
                      {isVideo && onSelectVideoForScene && file.webContentLink && (
                        <button
                          type="button"
                          onClick={() => onSelectVideoForScene(file.webContentLink!, file.name)}
                          className="px-2 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg text-[10px] font-bold border border-sky-500/30 flex items-center gap-1 transition"
                          title="Załaduj ten klip wideo jako tło sceny"
                        >
                          <Video className="w-3 h-3" />
                          <span>Użyj w Short</span>
                        </button>
                      )}
                    </div>

                    {/* Delete button (opens confirmation dialog) */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmFile(file)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                      title="Usuń plik z Dysku Google"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mandatory User Confirmation Dialog for Deletions */}
      <AnimatePresence>
        {deleteConfirmFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Potwierdzenie Usunięcia</h4>
                  <p className="text-xs text-slate-400">Operacja modyfikacji danych użytkownika</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Czy na pewno chcesz usunąć plik <strong>"{deleteConfirmFile.name}"</strong> z Dysku Google? Tej operacji nie można cofnąć.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmFile(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-rose-950"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Usuń trwale</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-sky-400">
                <Folder className="w-5 h-5" />
                <h4 className="text-base font-bold text-white">Utwórz Nowy Folder</h4>
              </div>

              <form onSubmit={handleCreateFolder} className="space-y-4">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nazwa folderu..."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingFolder || !newFolderName.trim()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    {isCreatingFolder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Utwórz</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
