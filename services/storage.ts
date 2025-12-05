import { User, Student, Material, Submission, AppSettings } from '../types';
import { INITIAL_ADMIN, DEFAULT_CERT_BG } from '../constants';

// --- HYBRID DATABASE ENGINE (Local + Google Spreadsheet) ---
// Data disimpan di LocalStorage untuk kecepatan instant (Optimistic UI)
// Dan disinkronkan ke Google Spreadsheet di background.

const KEYS = {
  USERS: 'senja_users',
  STUDENTS: 'senja_students',
  MATERIALS: 'senja_materials',
  SUBMISSIONS: 'senja_submissions',
  SETTINGS: 'senja_settings',
  SESSION: 'senja_session_current',
  API_URL: 'senja_spreadsheet_api_url'
};

// URL API Google Apps Script Anda
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbzJ2VqHuQvz1XxsmeZTsB-1AFP7qW2k7Fpmlkoah46ObMUP0zHGESTrUYDqMkvwrt3bcA/exec";

// --- API HELPER ---
const getApiUrl = () => {
    // Prioritaskan setting local, jika tidak ada gunakan default dari kode
    return localStorage.getItem(KEYS.API_URL) || DEFAULT_API_URL;
};

export const setApiUrl = (url: string) => {
    localStorage.setItem(KEYS.API_URL, url);
    if(url) syncAllFromCloud();
};

export const hasApiUrl = () => !!getApiUrl();

const apiRequest = async (action: 'create' | 'update' | 'delete', table: string, data: any) => {
    const url = getApiUrl();
    if (!url) return; 

    try {
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // Important for Google Apps Script Simple Triggers
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, table, data })
        });
    } catch (err) {
        console.error("Gagal sync ke spreadsheet:", err);
    }
};

const apiFetch = async (table: string) => {
    const url = getApiUrl();
    if (!url) return null;

    try {
        const res = await fetch(`${url}?action=read&table=${table}`);
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Gagal ambil dari spreadsheet:", err);
        return null;
    }
};

// --- SYNC LOGIC ---
const syncAllFromCloud = async () => {
    const tables = [
        { key: KEYS.USERS, table: 'users' },
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.MATERIALS, table: 'materials' },
        { key: KEYS.SUBMISSIONS, table: 'submissions' },
        { key: KEYS.SETTINGS, table: 'settings' }
    ];

    for (const t of tables) {
        const cloudData = await apiFetch(t.table);
        if (cloudData && Array.isArray(cloudData)) {
            if (cloudData.length > 0) {
                localStorage.setItem(t.key, JSON.stringify(cloudData));
                notify(t.key, cloudData);
            }
        }
    }
};


// --- EVENT EMITTER ---
const listeners: Record<string, Function[]> = {
  [KEYS.USERS]: [],
  [KEYS.STUDENTS]: [],
  [KEYS.MATERIALS]: [],
  [KEYS.SUBMISSIONS]: [],
  [KEYS.SETTINGS]: [],
};

const notify = (key: string, data: any) => {
  if (listeners[key]) {
    listeners[key].forEach(cb => cb(data));
  }
};

const getData = <T>(key: string): T[] => {
  const str = localStorage.getItem(key);
  return str ? JSON.parse(str) : [];
};

const setData = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
  notify(key, data);
};

// --- GENERIC CRUD ---
const saveItem = async (key: string, table: string, item: any) => {
    const list = getData<any>(key);
    let action: 'create' | 'update' = 'create';
    
    if (item.id) {
        const index = list.findIndex(i => i.id === item.id);
        if (index !== -1) {
            list[index] = item;
            action = 'update';
        } else {
            list.push(item);
        }
    } else {
        item.id = `${table.substring(0,3)}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        list.push(item);
    }
    
    // 1. Save Local (Instant)
    setData(key, list);
    
    // 2. Sync Cloud (Async)
    await apiRequest(action, table, item);
};

const deleteItem = async (key: string, table: string, id: string) => {
    const list = getData<any>(key);
    const newList = list.filter(i => i.id !== id);
    
    // 1. Save Local
    setData(key, newList);
    
    // 2. Sync Cloud
    await apiRequest('delete', table, { id });
};

// --- Subscription Wrappers ---
const createSubscriber = <T>(key: string, tableName: string) => (callback: (data: T[]) => void) => {
  listeners[key].push(callback);
  
  // Initial Local Load
  callback(getData<T>(key));

  // Trigger Cloud Sync in background if URL exists
  if (getApiUrl()) {
      apiFetch(tableName).then(cloudData => {
          if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
              const currentLocal = localStorage.getItem(key);
              const newCloud = JSON.stringify(cloudData);
              if (currentLocal !== newCloud) {
                  localStorage.setItem(key, newCloud);
                  callback(cloudData); // Notify UI with fresh cloud data
              }
          }
      });
  }

  return () => {
    listeners[key] = listeners[key].filter(cb => cb !== callback);
  };
};

// --- USERS ---
export const subscribeUsers = createSubscriber<User>(KEYS.USERS, 'users');

export const initAdminUser = async () => {
  const users = getData<User>(KEYS.USERS);
  if (users.length === 0) {
    const admin: User = { ...INITIAL_ADMIN, id: 'admin-1' };
    await saveItem(KEYS.USERS, 'users', admin);
  }
};

export const saveUser = async (user: User) => saveItem(KEYS.USERS, 'users', user);
export const deleteUser = async (id: string) => deleteItem(KEYS.USERS, 'users', id);

// --- STUDENTS ---
export const subscribeStudents = createSubscriber<Student>(KEYS.STUDENTS, 'students');
export const saveStudent = async (student: Student) => saveItem(KEYS.STUDENTS, 'students', student);
export const deleteStudent = async (id: string) => deleteItem(KEYS.STUDENTS, 'students', id);

export const bulkImportStudents = async (newStudents: Student[]) => {
  const list = getData<Student>(KEYS.STUDENTS);
  const prepared = newStudents.map((s, i) => ({ 
      ...s, 
      id: `std_${Date.now()}_${i}_${Math.random().toString(36).substr(2,4)}` 
  }));
  const combined = [...list, ...prepared];
  
  setData(KEYS.STUDENTS, combined);
  
  for (const s of prepared) {
      await apiRequest('create', 'students', s);
  }
};

// --- MATERIALS ---
export const subscribeMaterials = createSubscriber<Material>(KEYS.MATERIALS, 'materials');
export const saveMaterial = async (item: Material) => saveItem(KEYS.MATERIALS, 'materials', item);
export const deleteMaterial = async (id: string) => deleteItem(KEYS.MATERIALS, 'materials', id);

// --- SUBMISSIONS ---
export const subscribeSubmissions = createSubscriber<Submission>(KEYS.SUBMISSIONS, 'submissions');
export const saveSubmission = async (item: Submission) => saveItem(KEYS.SUBMISSIONS, 'submissions', item);

// --- SETTINGS ---
export const subscribeSettings = (cb: (s: AppSettings) => void) => {
    listeners[KEYS.SETTINGS].push(cb);
    
    // Local
    const saved = localStorage.getItem(KEYS.SETTINGS);
    const parsed = saved ? JSON.parse(saved) : { certBackground: DEFAULT_CERT_BG };
    cb(parsed);

    // Cloud
    if(getApiUrl()) {
         apiFetch('settings').then(data => {
             if(data && data.length > 0) {
                 const serverSettings = data.find((x: any) => x.id === 'global_settings') || data[0];
                 if(serverSettings) {
                    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(serverSettings));
                    cb(serverSettings);
                 }
             }
         });
    }

    return () => {
        listeners[KEYS.SETTINGS] = listeners[KEYS.SETTINGS].filter(x => x !== cb);
    };
};

export const saveSettings = async (settings: AppSettings) => {
  const payload = { ...settings, id: 'global_settings' }; // Force ID for singleton behavior
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(payload));
  notify(KEYS.SETTINGS, payload);
  await apiRequest('update', 'settings', payload); 
};

// --- SESSION ---
export const getSession = (): User | Student | null => {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
}

export const setSession = (user: User | Student) => {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
}

export const clearSession = () => {
    localStorage.removeItem(KEYS.SESSION);
}