import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import StudentView from './components/StudentView';
import { User, Student, Material, Submission, AppSettings, Question, FileAttachment } from './types';
import * as db from './services/storage';
import { GRADES } from './constants';
import { 
  Users, Trash2, Edit, Plus, Upload, X, FileText, Database, Settings as SettingsIcon
} from 'lucide-react';

function App() {
  const [session, setSession] = useState<User | Student | null>(null);
  const [view, setView] = useState('dashboard');
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ certBackground: '' });

  // Load Data with Realtime Listeners
  useEffect(() => {
    // Initialize default admin if needed
    db.initAdminUser();

    // Check local session
    const sess = db.getSession();
    if(sess) setSession(sess);

    // Subscribe to Local Storage (Instant) + Cloud Sync
    const unsubUsers = db.subscribeUsers(setUsers);
    const unsubStudents = db.subscribeStudents(setStudents);
    const unsubMaterials = db.subscribeMaterials(setMaterials);
    const unsubSubmissions = db.subscribeSubmissions(setSubmissions);
    const unsubSettings = db.subscribeSettings(setSettings);

    // Cleanup listeners on unmount
    return () => {
      unsubUsers();
      unsubStudents();
      unsubMaterials();
      unsubSubmissions();
      unsubSettings();
    };
  }, []);

  const handleLogin = (user: User | Student) => {
    setSession(user);
    db.setSession(user);
    setView('dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    db.clearSession();
  };

  // --- Login Component ---
  if (!session) {
    return <LoginScreen onLogin={handleLogin} users={users} students={students} />;
  }

  // --- Routing Logic ---
  const isStudent = (session as any).nisn !== undefined;
  const role = isStudent ? 'student' : (session as User).role;
  const teacherClass = !isStudent && role === 'teacher' ? (session as User).assignedClass : null;

  return (
    <Layout 
      user={session} 
      role={role} 
      onLogout={handleLogout} 
      currentView={view} 
      onNavigate={setView}
    >
      {view === 'dashboard' && (
        <Dashboard 
            role={role} 
            stats={{
                students: students.length,
                materials: materials.length,
                submissions: submissions.length,
                pending: submissions.filter(s => s.status === 'pending').length
            }} 
        />
      )}
      
      {view === 'students' && (role === 'admin' || role === 'teacher') && (
        <StudentManager 
            students={students} 
            role={role} 
            assignedClass={teacherClass}
        />
      )}

      {view === 'materials' && (role === 'admin' || role === 'teacher') && (
        <MaterialManager 
            materials={materials} 
            role={role}
            assignedClass={teacherClass}
        />
      )}

      {view === 'reading' && isStudent && (
        <StudentView 
            student={session as Student}
            materials={materials}
            settings={settings}
            submissions={submissions}
            onSubmit={(sub: Submission) => { db.saveSubmission(sub); }}
        />
      )}

      {view === 'grading' && (role === 'admin' || role === 'teacher') && (
        <GradingManager 
            submissions={submissions}
            materials={materials}
            role={role}
            assignedClass={teacherClass}
            onUpdate={(sub: Submission) => { db.saveSubmission(sub); }}
        />
      )}

      {view === 'users' && role === 'admin' && (
        <UserManager users={users} />
      )}

      {view === 'settings' && role === 'admin' && (
        <SettingsManager 
            settings={settings} 
            onSave={(s: AppSettings) => { db.saveSettings(s); }} 
        />
      )}
    </Layout>
  );
}

// --- Sub Components ---

const LoginScreen = ({ onLogin, users, students }: { onLogin: (u: User | Student) => void, users: User[], students: Student[] }) => {
    const [tab, setTab] = useState<'staff' | 'student'>('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [nisn, setNisn] = useState('');
    const [error, setError] = useState('');
    
    // DB Config Modal
    const [showDbConfig, setShowDbConfig] = useState(false);
    const [dbUrl, setDbUrl] = useState('');
    const [hasDb, setHasDb] = useState(false);

    useEffect(() => {
        setHasDb(db.hasApiUrl());
    }, []);

    const handleSaveDb = () => {
        db.setApiUrl(dbUrl);
        setHasDb(true);
        setShowDbConfig(false);
        alert("Database Spreadsheet terhubung! Data akan disinkronkan.");
        window.location.reload(); // Reload to fetch fresh data
    };

    const handleStaffLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Cek data (Instant)
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            setError('');
            onLogin(user);
        } else {
            setError("Username atau Password salah.");
        }
    };

    const handleStudentLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.nisn === nisn);
        if (student) {
            onLogin(student);
        } else {
             if (students.length === 0) {
                 setError("Data siswa masih kosong. Minta Admin import data.");
            } else {
                 setError("NISN tidak ditemukan.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden relative">
                {/* DB Config Button */}
                <button 
                    onClick={() => { setDbUrl(localStorage.getItem('senja_spreadsheet_api_url') || ''); setShowDbConfig(true); }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-brand-600 p-2"
                    title="Konfigurasi Database Spreadsheet"
                >
                    {hasDb ? <Database className="w-5 h-5 text-green-500" /> : <SettingsIcon className="w-5 h-5" />}
                </button>

                <div className="bg-brand-600 p-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">SENJA DIGITAL</h1>
                    <p className="text-brand-100">SD NEGERI 5 BILATO</p>
                </div>
                <div className="flex border-b">
                    <button onClick={() => {setTab('student'); setError('');}} className={`flex-1 py-4 font-bold ${tab === 'student' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-400'}`}>SISWA</button>
                    <button onClick={() => {setTab('staff'); setError('');}} className={`flex-1 py-4 font-bold ${tab === 'staff' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-400'}`}>GURU / ADMIN</button>
                </div>
                <div className="p-8">
                    {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm text-center animate-pulse">{error}</div>}
                    
                    {tab === 'staff' ? (
                        <form onSubmit={handleStaffLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input type="text" className="mt-1 w-full border rounded-lg p-3" value={username} onChange={e => setUsername(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input type="password" className="mt-1 w-full border rounded-lg p-3" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            
                            <button 
                                type="submit" 
                                className="w-full py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 bg-brand-600 text-white hover:bg-brand-700"
                            >
                                MASUK
                            </button>

                            <div className="text-center mt-4 space-y-2">
                                {hasDb && (
                                    <p className="text-xs flex items-center justify-center gap-1 text-green-600">
                                        <Database className="w-3 h-3"/> Terhubung ke Spreadsheet ✅
                                    </p>
                                )}
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleStudentLogin} className="space-y-4">
                            <div className="text-center mb-6">
                                <span className="inline-block bg-orange-100 text-orange-600 p-3 rounded-full mb-2">
                                    <Users className="w-6 h-6" />
                                </span>
                                <p className="text-sm text-gray-500">Masukkan NISN untuk mulai belajar</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">NISN</label>
                                <input type="text" className="mt-1 w-full border rounded-lg p-3 text-center text-lg tracking-widest" placeholder="Contoh: 1234567890" value={nisn} onChange={e => setNisn(e.target.value)} required />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 bg-orange-500 text-white hover:bg-orange-600"
                            >
                                MASUK KELAS
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Config Modal */}
            {showDbConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <h3 className="font-bold text-xl mb-2 flex items-center gap-2"><Database className="w-5 h-5 text-brand-600"/> Setup Spreadsheet</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Masukkan URL Web App dari Google Apps Script untuk menyinkronkan data.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase">Google Apps Script Web App URL</label>
                                <input 
                                    className="w-full border p-2 rounded text-sm mt-1" 
                                    placeholder="https://script.google.com/macros/s/..." 
                                    value={dbUrl}
                                    onChange={e => setDbUrl(e.target.value)}
                                />
                            </div>
                            <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200">
                                <strong>Panduan:</strong>
                                <ol className="list-decimal ml-4 mt-1 space-y-1">
                                    <li>Buka Google Sheet "DB SENJA DIGITAL"</li>
                                    <li>Klik Ekstensi &gt; Apps Script</li>
                                    <li>Paste kode script API</li>
                                    <li>Deploy sebagai Web App (Akses: Anyone)</li>
                                    <li>Copy URL-nya kesini</li>
                                </ol>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowDbConfig(false)} className="px-4 py-2 text-gray-600 text-sm">Batal</button>
                                <button onClick={handleSaveDb} className="px-4 py-2 bg-brand-600 text-white rounded text-sm font-bold">Simpan & Hubungkan</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface DashboardStats {
    students: number;
    materials: number;
    submissions: number;
    pending: number;
}

const Dashboard = ({ role, stats }: { role: string, stats: DashboardStats }) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard {role === 'student' ? 'Siswa' : 'Utama'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-brand-500">
                <p className="text-sm text-gray-500">Total Siswa</p>
                <p className="text-3xl font-bold">{stats.students}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
                <p className="text-sm text-gray-500">Bahan Bacaan</p>
                <p className="text-3xl font-bold">{stats.materials}</p>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-purple-500">
                <p className="text-sm text-gray-500">Total Tugas Masuk</p>
                <p className="text-3xl font-bold">{stats.submissions}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-orange-500">
                <p className="text-sm text-gray-500">Perlu Diperiksa</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
            </div>
        </div>
        <div className="bg-indigo-900 text-white rounded-xl p-8 flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold mb-2">Selamat Datang di Senja Digital</h3>
            <p className="max-w-2xl text-indigo-200">Platform Literasi Digital SD Negeri 5 Bilato. Mari tingkatkan minat baca dan kreativitas siswa melalui teknologi.</p>
        </div>
    </div>
);

interface StudentManagerProps {
    students: Student[];
    role: string;
    assignedClass?: string | null;
}

const StudentManager = ({ students, role, assignedClass }: StudentManagerProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [formData, setFormData] = useState<Partial<Student>>({});
    const [editMode, setEditMode] = useState(false);

    // Filter students AND SORT by Grade then Name
    const displayStudents = (role === 'teacher' && assignedClass
        ? students.filter((s) => s.grade === assignedClass)
        : students).sort((a, b) => {
            const gradeA = parseInt(a.grade);
            const gradeB = parseInt(b.grade);
            const gradeDiff = gradeA - gradeB;
            if (gradeDiff !== 0) return gradeDiff;
            return a.name.localeCompare(b.name);
        });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const student: Student = {
            id: editMode ? formData.id! : '', 
            nisn: formData.nisn!,
            name: formData.name!,
            gender: formData.gender as 'L'|'P',
            grade: formData.grade!
        };
        await db.saveStudent(student);
        setFormData({});
        setEditMode(false);
        setIsModalOpen(false);
    };

    const handleImport = async () => {
        const lines = importText.trim().split('\n');
        const newStudents: Student[] = [];
        lines.forEach(line => {
            const parts = line.split('\t');
            if (parts.length >= 4) {
                newStudents.push({
                    id: '', 
                    nisn: parts[0].trim(),
                    name: parts[1].trim(),
                    gender: parts[2].trim().toUpperCase() as 'L'|'P',
                    grade: parts[3].trim()
                });
            }
        });

        if (newStudents.length > 0) {
            await db.bulkImportStudents(newStudents);
            setImportText('');
            alert(`Berhasil import ${newStudents.length} siswa`);
        } else {
            alert('Format salah. Pastikan copy dari Excel dengan urutan: NISN | Nama | L/P | Kelas');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Daftar Siswa {assignedClass ? `Kelas ${assignedClass}` : ''}</h2>
                <div className="flex gap-2">
                    <button onClick={() => { setIsModalOpen(true); setEditMode(false); }} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700">
                        <Plus className="w-4 h-4" /> Tambah Manual
                    </button>
                </div>
            </div>

            {/* Import Box */}
            <div className="bg-white p-4 rounded-xl border shadow-sm">
                <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Upload className="w-4 h-4"/> Import Excel (Copy Paste)</h3>
                <textarea 
                    className="w-full border p-2 text-xs h-24 rounded" 
                    placeholder="Paste data dari Excel disini. Format: NISN | Nama | L/P | Kelas"
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                />
                <button onClick={handleImport} className="mt-2 bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700">Proses Import</button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 border-b">
                        <tr>
                            <th className="p-4">NISN</th>
                            <th className="p-4">Nama Lengkap</th>
                            <th className="p-4">L/P</th>
                            <th className="p-4">Kelas</th>
                            <th className="p-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {displayStudents.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 font-mono">{s.nisn}</td>
                                <td className="p-4 font-bold">{s.name}</td>
                                <td className="p-4">{s.gender}</td>
                                <td className="p-4"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Kelas {s.grade}</span></td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => { setFormData(s); setEditMode(true); setIsModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit className="w-4 h-4"/></button>
                                    <button onClick={() => { if(confirm('Hapus siswa?')) { db.deleteStudent(s.id); } }} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {displayStudents.length === 0 && <div className="p-8 text-center text-gray-400">Belum ada data siswa</div>}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md">
                        <h3 className="font-bold text-xl mb-4">{editMode ? 'Edit' : 'Tambah'} Siswa</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <input className="w-full border p-2 rounded" placeholder="NISN" value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})} required />
                            <input className="w-full border p-2 rounded" placeholder="Nama Lengkap" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            <select className="w-full border p-2 rounded" value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value as any})} required>
                                <option value="">Pilih Gender</option>
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                            <select className="w-full border p-2 rounded" value={formData.grade || ''} onChange={e => setFormData({...formData, grade: e.target.value})} required disabled={!!assignedClass && formData.grade !== assignedClass}>
                                <option value="">Pilih Kelas</option>
                                {GRADES.map(g => <option key={g} value={g}>Kelas {g}</option>)}
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

interface MaterialManagerProps {
    materials: Material[];
    role: string;
    assignedClass?: string | null;
}

const MaterialManager = ({ materials, role, assignedClass }: MaterialManagerProps) => {
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [formData, setFormData] = useState<Partial<Material>>({ questions: [] });
    const [inputType, setInputType] = useState<'url' | 'file'>('url');
    
    // Sort Materials by Grade then Title
    const displayMaterials = (role === 'teacher' && assignedClass
        ? materials.filter((m) => m.grade === assignedClass)
        : materials).sort((a, b) => {
            const gradeDiff = parseInt(a.grade) - parseInt(b.grade);
            if (gradeDiff !== 0) return gradeDiff;
            return a.title.localeCompare(b.title);
        });

    const handleSave = async () => {
        if (!formData.title || !formData.grade || !formData.url) {
            alert("Lengkapi data judul, kelas dan sumber materi (Link/File)");
            return;
        }
        const material: Material = {
            id: formData.id || '', // Firebase generates ID
            title: formData.title!,
            grade: formData.grade!,
            type: formData.type || 'pdf',
            url: formData.url!,
            questions: formData.questions || [],
            taskDescription: formData.taskDescription || ''
        };
        await db.saveMaterial(material);
        setViewMode('list');
        setFormData({ questions: [] });
        setInputType('url');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const MAX_FILE_SIZE = 2 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) { // Reduced to 2MB for Firestore limit safety
                alert("Ukuran file maksimal 2MB (Limit Database). Gunakan Link untuk file besar.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, url: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const addQuestion = () => {
        const newQ = { id: Date.now().toString(), text: '' };
        setFormData({ ...formData, questions: [...(formData.questions || []), newQ] });
    };

    const updateQuestion = (idx: number, text: string) => {
        const newQs = [...(formData.questions || [])];
        newQs[idx].text = text;
        setFormData({ ...formData, questions: newQs });
    };

    const removeQuestion = (idx: number) => {
        const newQs = [...(formData.questions || [])];
        newQs.splice(idx, 1);
        setFormData({ ...formData, questions: newQs });
    };

    if (viewMode === 'form') {
        return (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-3xl mx-auto">
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-xl">Editor Bahan Bacaan</h2>
                    <button onClick={() => setViewMode('list')} className="text-gray-500 hover:text-gray-700"><X /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Judul Materi</label>
                            <input className="input" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="label">Kelas</label>
                            <select className="input" value={formData.grade || ''} onChange={e => setFormData({...formData, grade: e.target.value})} disabled={!!assignedClass}>
                                <option value="">Pilih</option>
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="label">Tipe Materi</label>
                            <select className="input" value={formData.type || 'pdf'} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                <option value="pdf">Dokumen (PDF)</option>
                                <option value="image">Gambar</option>
                                <option value="video">Video</option>
                                <option value="article">Artikel Web</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="label mb-2 block">Sumber Materi</label>
                            <div className="flex gap-4 mb-2 text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={inputType === 'url'} onChange={() => setInputType('url')} />
                                    <span>Link URL (Youtube/Web)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={inputType === 'file'} onChange={() => setInputType('file')} />
                                    <span>Upload File (HP/Laptop)</span>
                                </label>
                            </div>

                            {inputType === 'url' ? (
                                <input 
                                    className="input" 
                                    placeholder={formData.type === 'video' ? "https://youtube.com/..." : "https://..."} 
                                    value={formData.url?.startsWith('data:') ? '' : formData.url || ''} 
                                    onChange={e => setFormData({...formData, url: e.target.value})} 
                                />
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
                                    <input 
                                        type="file" 
                                        accept={formData.type === 'image' ? 'image/*' : formData.type === 'video' ? 'video/*' : '.pdf'}
                                        onChange={handleFileChange} 
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                                    />
                                    {formData.url?.startsWith('data:') && <p className="text-xs text-green-600 mt-2 font-bold">File berhasil dipilih!</p>}
                                    <p className="text-xs text-gray-400 mt-1">Max: 2MB (Gunakan Link jika file besar)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-brand-700">Pertanyaan Refleksi</h3>
                            <button onClick={addQuestion} className="text-sm bg-brand-100 text-brand-700 px-3 py-1 rounded hover:bg-brand-200">+ Tambah Tanya</button>
                        </div>
                        <div className="space-y-3">
                            {formData.questions?.map((q: Question, idx: number) => (
                                <div key={q.id} className="flex gap-2">
                                    <span className="mt-2 text-xs font-bold text-gray-400">{idx+1}.</span>
                                    <input className="input flex-1" value={q.text} onChange={e => updateQuestion(idx, e.target.value)} placeholder="Tulis pertanyaan..." />
                                    <button onClick={() => removeQuestion(idx)} className="text-red-400 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            ))}
                            {formData.questions?.length === 0 && <p className="text-sm text-gray-400 italic">Belum ada pertanyaan.</p>}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-bold text-brand-700 mb-2">Instruksi Tugas</h3>
                        <textarea className="input w-full h-24" placeholder="Jelaskan tugas yang harus dikerjakan siswa..." value={formData.taskDescription || ''} onChange={e => setFormData({...formData, taskDescription: e.target.value})} />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={handleSave} className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-brand-700">Simpan Materi</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Bahan Bacaan</h2>
                <button onClick={() => { setFormData({ questions: [], grade: assignedClass || '' }); setViewMode('form'); }} className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Materi
                </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                {displayMaterials.map((m) => (
                    <div key={m.id} className="bg-white p-4 rounded-xl shadow border flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-gray-100 text-xs font-bold px-2 py-1 rounded">Kelas {m.grade}</span>
                            <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                                m.type === 'video' ? 'bg-red-100 text-red-600' : 
                                m.type === 'image' ? 'bg-purple-100 text-purple-600' :
                                'bg-blue-100 text-blue-600'
                            }`}>
                                {m.type}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">{m.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{m.taskDescription}</p>
                        <div className="flex gap-2 justify-end border-t pt-2">
                            <button onClick={() => { setFormData(m); setInputType(m.url.startsWith('data:') ? 'file' : 'url'); setViewMode('form'); }} className="text-blue-600 text-sm hover:underline">Edit</button>
                            <button onClick={() => { if(confirm('Hapus?')) { db.deleteMaterial(m.id); } }} className="text-red-600 text-sm hover:underline">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface GradingManagerProps {
    submissions: Submission[];
    materials: Material[];
    role: string;
    assignedClass?: string | null;
    onUpdate: (s: Submission) => void;
}

const GradingManager = ({ submissions, materials, role, assignedClass, onUpdate }: GradingManagerProps) => {
    const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

    // Filter logic
    const displaySubs = (role === 'teacher' && assignedClass
        ? submissions.filter((s) => s.grade === assignedClass)
        : submissions).sort((a, b) => {
            // Prioritize Pending First
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;

            // Sort by Grade
            const gradeA = parseInt(a.grade || '0');
            const gradeB = parseInt(b.grade || '0');
            const gradeDiff = gradeA - gradeB;
            if (gradeDiff !== 0) return gradeDiff;

            // Sort by Student Name
            return a.studentName.localeCompare(b.studentName);
        });

    const handleApprove = (approve: boolean) => {
        if (!selectedSub) return;
        const updated = { 
            ...selectedSub, 
            status: approve ? 'approved' : 'rejected',
            feedback: selectedSub.feedback || (approve ? 'Kerja bagus!' : 'Mohon perbaiki.')
        } as Submission;
        onUpdate(updated);
        setSelectedSub(null);
    };

    const renderAttachment = (file: FileAttachment) => {
        if (!file) return null;
        if (file.type.startsWith('image/')) {
            return (
                <div className="mt-2">
                    <img src={file.data} alt="Attachment" className="max-w-full h-auto rounded border shadow-sm max-h-64 object-contain" />
                    <p className="text-xs text-gray-500 mt-1">{file.name}</p>
                </div>
            )
        }
        return (
            <div className="mt-2">
                <a href={file.data} download={file.name} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded border border-blue-100 hover:bg-blue-100 w-fit">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Download {file.name}</span>
                </a>
            </div>
        )
    };

    if (selectedSub) {
        const material = materials.find((m) => m.id === selectedSub.materialId);
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                        <h3 className="font-bold text-lg">Periksa Tugas: {selectedSub.studentName}</h3>
                        <button onClick={() => setSelectedSub(null)}><X /></button>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="bg-gray-50 p-4 rounded">
                            <h4 className="font-bold text-sm text-gray-500">Materi</h4>
                            <p>{selectedSub.materialTitle}</p>
                        </div>

                        <div>
                            <h4 className="font-bold text-brand-700 mb-2 border-b">Jawaban Refleksi</h4>
                            <ul className="space-y-4">
                                {selectedSub.answers.map((ans, i) => {
                                    const qText = material?.questions.find((q: Question) => q.id === ans.questionId)?.text || `Pertanyaan ${i+1}`;
                                    return (
                                        <li key={i} className="text-sm border-b pb-4 last:border-0">
                                            <p className="font-semibold text-gray-700 mb-1">{qText}</p>
                                            <p className="bg-gray-50 p-2 rounded border italic">{ans.answer}</p>
                                            {ans.attachment && renderAttachment(ans.attachment)}
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-brand-700 mb-2 border-b">Tugas / Aksi Nyata</h4>
                            <div className="bg-orange-50 p-4 rounded border text-sm whitespace-pre-wrap mb-4">
                                {selectedSub.taskResponse}
                            </div>
                            
                            {selectedSub.taskAttachments && selectedSub.taskAttachments.length > 0 && (
                                <div className="space-y-3">
                                    <h5 className="font-bold text-xs text-gray-500 uppercase">Lampiran File Tugas</h5>
                                    <div className="grid gap-4">
                                        {selectedSub.taskAttachments.map((att, idx) => (
                                            <div key={idx} className="bg-white border rounded p-2">
                                                 {renderAttachment(att)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                             <label className="font-bold text-sm">Catatan Guru</label>
                             <textarea 
                                className="w-full border rounded p-2 mt-1" 
                                value={selectedSub.feedback || ''} 
                                onChange={e => setSelectedSub({...selectedSub, feedback: e.target.value})}
                                placeholder="Berikan semangat atau saran..."
                             />
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
                         <button onClick={() => handleApprove(false)} className="px-4 py-2 text-red-600 bg-red-100 rounded hover:bg-red-200">Tolak & Minta Revisi</button>
                         <button onClick={() => handleApprove(true)} className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 font-bold">Setujui & Beri Sertifikat</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Pemeriksaan Tugas</h2>
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-4">Tanggal</th>
                            <th className="p-4">Nama Siswa</th>
                            <th className="p-4">Kelas</th>
                            <th className="p-4">Judul Materi</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {displaySubs.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 text-gray-500">{new Date(s.submittedAt).toLocaleDateString('id-ID')}</td>
                                <td className="p-4 font-bold">{s.studentName}</td>
                                <td className="p-4">{s.grade}</td>
                                <td className="p-4">{s.materialTitle}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                        s.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        s.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {s.status === 'pending' ? 'Menunggu' : s.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button onClick={() => setSelectedSub(s)} className="text-blue-600 font-bold hover:underline">Periksa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {displaySubs.length === 0 && <div className="p-8 text-center text-gray-400">Belum ada tugas masuk</div>}
            </div>
        </div>
    );
};

const UserManager = ({ users }: { users: User[] }) => {
    const [formData, setFormData] = useState<Partial<User>>({});

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const user: User = {
            id: '', // Firebase generates
            username: formData.username!,
            password: formData.password!,
            fullName: formData.fullName!,
            role: formData.role || 'teacher',
            assignedClass: formData.assignedClass
        };
        await db.saveUser(user);
        setFormData({});
        alert("User berhasil ditambahkan");
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Manajemen User</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                    <h3 className="font-bold mb-4">Tambah User Baru</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <input className="input" placeholder="Username" value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} required />
                        <input className="input" type="password" placeholder="Password" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} required />
                        <input className="input" placeholder="Nama Lengkap" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
                        <select className="input" value={formData.role || 'teacher'} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                             <option value="teacher">Wali Kelas</option>
                             <option value="admin">Admin</option>
                        </select>
                        {formData.role !== 'admin' && (
                            <select className="input" value={formData.assignedClass || ''} onChange={e => setFormData({...formData, assignedClass: e.target.value})}>
                                <option value="">Pilih Kelas Ampuan</option>
                                {GRADES.map(g => <option key={g} value={g}>Kelas {g}</option>)}
                            </select>
                        )}
                        <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded font-bold hover:bg-brand-700">Simpan User</button>
                    </form>
                </div>

                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4">Username</th>
                                <th className="p-4">Nama</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="p-4">{u.username}</td>
                                    <td className="p-4">{u.fullName} {u.assignedClass ? `(Kelas ${u.assignedClass})` : ''}</td>
                                    <td className="p-4 uppercase text-xs font-bold">{u.role}</td>
                                    <td className="p-4">
                                        {u.username !== 'admin' && (
                                            <button onClick={() => { if(confirm('Hapus user?')) { db.deleteUser(u.id); } }} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const SettingsManager = ({ settings, onSave }: { settings: AppSettings, onSave: (s: AppSettings) => void }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onSave({ ...settings, certBackground: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-xl">
             <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan Sertifikat</h2>
             <div className="bg-white p-6 rounded-xl shadow border">
                 <div className="mb-4">
                     <p className="text-sm text-gray-600 mb-2">Upload gambar background untuk sertifikat siswa (Format Landscape, JPG/PNG).</p>
                     <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                 </div>
                 {settings.certBackground && (
                     <div className="mt-4 border rounded p-2">
                         <p className="text-xs text-gray-400 mb-1">Preview:</p>
                         <img src={settings.certBackground} alt="Cert BG" className="w-full h-auto rounded" />
                     </div>
                 )}
             </div>
        </div>
    );
};

export default App;