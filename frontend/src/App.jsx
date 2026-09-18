import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import StudentPortal from './pages/StudentPortal';
import FacultyPortal from './pages/FacultyPortal';

function App() {
  const [role, setRole] = useState(null); // 'student' | 'faculty' | null
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Restore saved session if any
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('edushield_role');
      const savedUser = localStorage.getItem('edushield_user');
      if (savedRole && savedUser) {
        setRole(savedRole);
        setUser(JSON.parse(savedUser));
        setActiveTab(savedRole === 'student' ? 'academic' : 'watchlist');
      }
    } catch (e) {
      console.warn("Storage restore error", e);
    }
  }, []);

  const handleLoginSuccess = (userRole, userData) => {
    setRole(userRole);
    setUser(userData);
    setActiveTab(userRole === 'student' ? 'academic' : 'watchlist');
    try {
      localStorage.setItem('edushield_role', userRole);
      localStorage.setItem('edushield_user', JSON.stringify(userData));
    } catch (e) {}
  };

  const handleLogout = () => {
    setRole(null);
    setUser(null);
    setActiveTab(null);
    try {
      localStorage.removeItem('edushield_role');
      localStorage.removeItem('edushield_user');
    } catch (e) {}
  };

  return (
    <div className={`${role ? 'app-shell' : ''} ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {role && (
        <Navbar
          user={user}
          role={role}
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      )}

      <main className={role ? 'app-main' : undefined} style={{ flex: 1 }}>
        {!role ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : role === 'student' ? (
          <StudentPortal
            student={user}
            onRefresh={() => {}}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        ) : (
          <FacultyPortal
            faculty={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      {/* Footer */}
      <footer className={role ? 'app-footer' : undefined} style={{
        borderTop: '1px solid var(--border-color)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        background: 'rgba(11, 15, 25, 0.95)'
      }}>
        ARGUS STUDENT 360 • AI-Based Academic Risk Prediction & Personalized Intervention System • FUSIONX 1.0 Hackathon Prototype
      </footer>
    </div>
  );
}

export default App;
