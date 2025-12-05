import React from 'react';
import { 
  Users, BookOpen, GraduationCap, Settings, LogOut, 
  Menu, X, ClipboardCheck, UserPlus, Library
} from 'lucide-react';
import { User, Student } from '../types';

interface LayoutProps {
  user: User | Student;
  role: 'admin' | 'teacher' | 'student';
  children: React.ReactNode;
  onLogout: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, role, children, onLogout, currentView, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Define menus based on role
  const menus = [
    { id: 'dashboard', label: 'Dashboard', icon: Library, roles: ['admin', 'teacher', 'student'] },
    { id: 'students', label: 'Daftar Siswa', icon: Users, roles: ['admin', 'teacher'] },
    { id: 'materials', label: 'Input Bahan Bacaan', icon: BookOpen, roles: ['admin', 'teacher'] },
    { id: 'reading', label: 'Ruang Baca', icon: BookOpen, roles: ['student'] },
    { id: 'grading', label: 'Hasil Refleksi', icon: ClipboardCheck, roles: ['admin', 'teacher'] },
    { id: 'users', label: 'Manajemen User', icon: UserPlus, roles: ['admin'] },
    { id: 'settings', label: 'Pengaturan', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenus = menus.filter(m => m.roles.includes(role));

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Helper to safely get name
  const getUserName = () => {
    if ('name' in user) {
        return (user as Student).name;
    }
    return (user as User).fullName;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-brand-900 text-white transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-center h-20 border-b border-brand-700 bg-brand-800">
          <div className="flex items-center gap-2 px-4">
             <GraduationCap className="w-8 h-8 text-yellow-400" />
             <div className="flex flex-col">
                <span className="text-sm font-bold tracking-wider">SENJA DIGITAL</span>
                <span className="text-xs text-brand-100">SD NEGERI 5 BILATO</span>
             </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {filteredMenus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                onNavigate(menu.id);
                setIsSidebarOpen(false);
              }}
              className={`flex items-center w-full px-4 py-3 text-sm transition-colors rounded-lg group ${
                currentView === menu.id 
                  ? 'bg-brand-600 text-white shadow-lg' 
                  : 'text-brand-100 hover:bg-brand-800 hover:text-white'
              }`}
            >
              <menu.icon className="w-5 h-5 mr-3" />
              {menu.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-brand-700">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 text-sm text-red-200 transition-colors rounded-lg hover:bg-red-900/50 hover:text-red-100"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Keluar
            </button>
          </div>
        </nav>
        
        <div className="absolute bottom-0 w-full p-4 bg-brand-950 text-xs text-center text-brand-400">
            &copy; 2024 SD Negeri 5 Bilato
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-20 px-6 bg-white border-b shadow-sm">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="p-2 mr-4 text-gray-600 rounded-lg lg:hidden hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 hidden md:block">
              {filteredMenus.find(m => m.id === currentView)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{getUserName()}</p>
              <p className="text-xs text-gray-500 capitalize">
                {role === 'teacher' ? `Wali Kelas ${(user as User).assignedClass || '?'}` : role === 'student' ? 'Siswa' : 'Administrator'}
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-brand-500 font-bold">
               {getUserName().charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;