import { getAccessToken } from './googleDriveService';

export interface SheetTabProperty {
  sheetId: number;
  title: string;
  index: number;
  gridProperties?: {
    rowCount: number;
    columnCount: number;
  };
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  properties: {
    title: string;
    locale?: string;
    timeZone?: string;
  };
  sheets: Array<{
    properties: SheetTabProperty;
  }>;
  spreadsheetUrl?: string;
}

export interface SpreadsheetValues {
  range: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  values: (string | number | boolean)[][];
}

export interface SpreadsheetListItem {
  id: string;
  name: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  size?: string;
}

/**
 * List all Google Sheets files available in the user's Google Drive
 */
export const listSpreadsheets = async (searchQuery?: string): Promise<SpreadsheetListItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Workspace. Zaloguj się przez konto Google.');

  const conditions = [
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    'trashed = false'
  ];

  if (searchQuery && searchQuery.trim()) {
    const clean = searchQuery.trim().replace(/'/g, "\\'");
    conditions.push(`name contains '${clean}'`);
  }

  const q = conditions.join(' and ');
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', '30');
  url.searchParams.set('fields', 'files(id,name,modifiedTime,createdTime,webViewLink,size)');
  url.searchParams.set('orderBy', 'modifiedTime desc');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd pobierania listy arkuszy Google (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Fetch spreadsheet metadata and list of all tabs/worksheets without hardcoding "Sheet1"
 */
export const getSpreadsheetMetadata = async (spreadsheetId: string): Promise<SpreadsheetMetadata> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Workspace.');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title,index,gridProperties),spreadsheetUrl`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Nie udało się pobrać informacji o arkuszu (${res.status})`);
  }

  return await res.json();
};

/**
 * Quotes a Google Sheets tab/worksheet title if needed, escaping any existing single quotes
 * according to standard Google Sheets A1 notation.
 */
export const quoteSheetTitle = (title: string): string => {
  if (!title) return "''";
  let cleanTitle = title.trim();
  // If already enclosed in single quotes, strip them before normalizing
  if (cleanTitle.startsWith("'") && cleanTitle.endsWith("'") && cleanTitle.length >= 2) {
    cleanTitle = cleanTitle.slice(1, -1).replace(/''/g, "'");
  }
  // Escape any single quotes as '' (Sheets API v4 specification)
  const escaped = cleanTitle.replace(/'/g, "''");
  // Always wrap in single quotes to guarantee parsing regardless of spaces, hyphens, non-ASCII (Polish characters), etc.
  return `'${escaped}'`;
};

/**
 * Normalizes an arbitrary range string so that the sheet title portion is safely quoted.
 * Handles cases like:
 * - "Struktura bazy danych - Metadane Generacji AI V2!A1:Z100" -> "'Struktura bazy danych - Metadane Generacji AI V2'!A1:Z100"
 * - "'Already Quoted'!A1:Z100" -> "'Already Quoted'!A1:Z100"
 * - "A1:Z100" -> "A1:Z100"
 * - "My Tab Name" -> "'My Tab Name'"
 */
export const normalizeA1Range = (rawRange: string): string => {
  if (!rawRange) return rawRange;
  const trimmed = rawRange.trim();

  if (trimmed.includes('!')) {
    const lastBang = trimmed.lastIndexOf('!');
    const sheetPart = trimmed.substring(0, lastBang);
    const cellsPart = trimmed.substring(lastBang + 1);
    return `${quoteSheetTitle(sheetPart)}!${cellsPart}`;
  }

  // If it's a standalone cell range like A1:Z100 or A:Z, leave as is
  if (/^[A-Za-z]+[0-9]*(:[A-Za-z]+[0-9]*)?$/.test(trimmed)) {
    return trimmed;
  }

  // Otherwise it's a sheet title
  return quoteSheetTitle(trimmed);
};

/**
 * Formats a sheet title and cell range safely in A1 notation (e.g. "'Sheet 1'!A1:Z100")
 */
export const formatA1Range = (sheetTitle: string, cellRange?: string): string => {
  if (!sheetTitle) return cellRange || '';
  if (sheetTitle.includes('!')) {
    return normalizeA1Range(sheetTitle);
  }
  const quoted = quoteSheetTitle(sheetTitle);
  return cellRange ? `${quoted}!${cellRange}` : quoted;
};

/**
 * Fetch cell values for a given range (e.g. "Arkusze1!A1:Z50" or dynamic tab title)
 */
export const getSpreadsheetValues = async (
  spreadsheetId: string,
  range: string
): Promise<SpreadsheetValues> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Workspace.');

  const safeRange = normalizeA1Range(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(safeRange)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd pobierania danych z zakresu "${safeRange}" (${res.status})`);
  }

  const data = await res.json();
  return {
    range: data.range || safeRange,
    majorDimension: data.majorDimension || 'ROWS',
    values: data.values || []
  };
};

/**
 * Append one or more rows to the specified spreadsheet and tab
 */
export const appendSpreadsheetRows = async (
  spreadsheetId: string,
  range: string,
  rows: (string | number | boolean)[][]
): Promise<{ updatedRows: number; updatedRange: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Workspace.');

  const safeRange = normalizeA1Range(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(safeRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: rows
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Nie udało się dopisać wierszy do arkusza (${res.status})`);
  }

  const data = await res.json();
  return {
    updatedRows: data.updates?.updatedRows || rows.length,
    updatedRange: data.updates?.updatedRange || safeRange
  };
};

/**
 * Update values in a specific range
 */
export const updateSpreadsheetRange = async (
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Workspace.');

  const safeRange = normalizeA1Range(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(safeRange)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd zapisu danych do komórek (${res.status})`);
  }
};

/**
 * Clear values in a range (DESTRUCTIVE OPERATION - Requires explicit user confirmation in UI)
 */
export const clearSpreadsheetRange = async (
  spreadsheetId: string,
  range: string
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Workspace.');

  const safeRange = normalizeA1Range(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(safeRange)}:clear`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Nie udało się wyczyścić zawartości zakresu (${res.status})`);
  }
};

/**
 * Delete a spreadsheet from Google Drive (DESTRUCTIVE OPERATION - Requires explicit user confirmation in UI)
 */
export const deleteSpreadsheet = async (spreadsheetId: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Workspace.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Nie udało się usunąć arkusza Google (${res.status})`);
  }
};

/**
 * Create a new blank or pre-structured Google Spreadsheet
 */
export const createSpreadsheet = async (
  title: string,
  initialSheets?: Array<{ title: string; headers?: string[]; starterRows?: (string | number)[][] }>
): Promise<SpreadsheetMetadata> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Workspace.');

  const payload: any = {
    properties: {
      title,
      locale: 'pl_PL'
    }
  };

  if (initialSheets && initialSheets.length > 0) {
    payload.sheets = initialSheets.map((sh, idx) => ({
      properties: {
        sheetId: idx,
        title: sh.title,
        index: idx
      }
    }));
  }

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Nie udało się utworzyć nowego arkusza (${res.status})`);
  }

  const created: SpreadsheetMetadata = await res.json();

  // If initial headers or starter rows provided, populate them
  if (initialSheets && initialSheets.length > 0) {
    for (const sh of initialSheets) {
      const rowsToAppend: (string | number)[][] = [];
      if (sh.headers && sh.headers.length > 0) {
        rowsToAppend.push(sh.headers);
      }
      if (sh.starterRows && sh.starterRows.length > 0) {
        rowsToAppend.push(...sh.starterRows);
      }
      if (rowsToAppend.length > 0) {
        try {
          await appendSpreadsheetRows(created.spreadsheetId, formatA1Range(sh.title, 'A1'), rowsToAppend);
        } catch (appendErr) {
          console.warn(`Nie udało się wstępnie wypełnić arkusza "${sh.title}":`, appendErr);
        }
      }
    }
  }

  return created;
};

/**
 * Pre-made financial templates for RaportFinansowy24
 */
export const FINANCIAL_TEMPLATES = {
  calendar: {
    id: 'calendar',
    title: 'RaportFinansowy24 - Kalendarz Publikacji Shorts',
    description: 'Harmonogram postów wideo, haczyków, dat publikacji na TikTok/YouTube Shorts i statusów.',
    sheets: [
      {
        title: 'Plan Publikacji',
        headers: ['Data', 'Tytuł Shorts', 'Hook (Pierwsze 3s)', 'Platforma docelowa', 'Lektor AI', 'Status', 'Link do Wideo', 'Notatki'],
        starterRows: [
          [new Date().toISOString().slice(0, 10), 'Czy stopy procentowe znowu wzrosną?', 'Uważaj, Twoja rata kredytu może skoczyć o kilkaset złotych!', 'TikTok + Shorts', 'pl-PL-MarekNeural', 'Gotowy do publikacji', '', 'Wysoki priorytet - temat RPP'],
          [new Date(Date.now() + 86400000).toISOString().slice(0, 10), 'Najlepsze lokaty bankowe 8%', 'Nie trzymaj pieniędzy na zerowym koncie, banki dają nawet 8%!', 'YouTube Shorts', 'pl-PL-ZofiaNeural', 'W szkicu', '', 'Afiliacja kont oszczędnościowych']
        ]
      }
    ]
  },
  rates: {
    id: 'rates',
    title: 'RaportFinansowy24 - Monitoring Kursów & RRSO',
    description: 'Rejestr stawek RRSO, ofert banków, lokat i pożyczek do tworzenia rzetelnych filmów.',
    sheets: [
      {
        title: 'Oferty Finansowe',
        headers: ['Instytucja / Bank', 'Produkt Finansowy', 'RRSO / Oprocentowanie', 'Prowizja', 'Maks. Kwota (PLN)', 'Okres spłaty', 'Data Weryfikacji', 'Status Oferty'],
        starterRows: [
          ['PKO BP', 'Kredyt Gotówkowy', '9.80%', '0.00%', '200000', '120 mies.', new Date().toISOString().slice(0, 10), 'Aktywna'],
          ['Santander', 'Konto Oszczędnościowe', '7.00%', '0 PLN', '100000', '3 mies.', new Date().toISOString().slice(0, 10), 'Promocyjna'],
          ['Alior Bank', 'Pożyczka Internetowa', '10.50%', '1.50%', '150000', '60 mies.', new Date().toISOString().slice(0, 10), 'Wymaga aktualizacji']
        ]
      }
    ]
  },
  jobs_roi: {
    id: 'jobs_roi',
    title: 'RaportFinansowy24 - Logi Wyrenderowanych Shorts & ROI',
    description: 'Automatyczny dziennik renderów FFmpeg, czasów trwania, scen i statystyk konwersji.',
    sheets: [
      {
        title: 'Historia Renderów',
        headers: ['Data i Czas', 'Tytuł Filmu', 'Czas trwania (s)', 'Liczba Scen', 'Głos TTS', 'Job ID', 'Status Renderu', 'Plik / Link', 'Kliknięcia / ROI'],
        starterRows: [
          [new Date().toLocaleString('pl-PL'), 'Inwestycje w złoto vs inflacja', '18.0', '2', 'pl-PL-MarekNeural', 'job-demo-init', 'Zakończony sukcesem', '/rendered/output.mp4', '0']
        ]
      }
    ]
  }
};

/**
 * Create a specialized RaportFinansowy24 financial template in Google Sheets
 */
export const createFinancialTemplateSpreadsheet = async (
  templateKey: keyof typeof FINANCIAL_TEMPLATES
): Promise<SpreadsheetMetadata> => {
  const tpl = FINANCIAL_TEMPLATES[templateKey];
  if (!tpl) throw new Error('Nieznany szablon arkusza.');

  return await createSpreadsheet(tpl.title, tpl.sheets);
};

/**
 * Log a completed video render or AI scene batch into Google Sheets
 */
export const logVideoRenderToSheet = async (
  spreadsheetId: string,
  tabTitle: string,
  job: {
    title: string;
    duration?: number;
    sceneCount?: number;
    voice?: string;
    jobId: string;
    status: string;
    videoUrl?: string;
  }
): Promise<{ updatedRows: number; updatedRange: string }> => {
  const row = [
    new Date().toLocaleString('pl-PL'),
    job.title || 'AI Shorts Finansowy',
    job.duration ? `${job.duration}s` : '18s',
    job.sceneCount || 2,
    job.voice || 'pl-PL-MarekNeural',
    job.jobId,
    job.status || 'Zakończony sukcesem',
    job.videoUrl || '',
    '0'
  ];

  return await appendSpreadsheetRows(spreadsheetId, formatA1Range(tabTitle, 'A1'), [row]);
};
