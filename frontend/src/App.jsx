import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import StudentPortal from './pages/StudentPortal';
import FacultyPortal from './pages/FacultyPortal';

function App() {
  const [role, setRole] = useState(null); // 'student' | 'faculty' | null
  const [user, setUser] = useState(null);

  // Restore saved session if any
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('edushield_role');
      const savedUser = localStorage.getItem('edushield_user');
      if (savedRole && savedUser) {
        setRole(savedRole);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.warn("Storage restore error", e);
    }
  }, []);

  const handleLoginSuccess = (userRole, userData) => {
    setRole(userRole);
    setUser(userData);
    try {
      localStorage.setItem('edushield_role', userRole);
      localStorage.setItem('edushield_user', JSON.stringify(userData));
    } catch (e) {}
  };

  const handleLogout = () => {
    setRole(null);
    setUser(null);
    try {
      localStorage.removeItem('edushield_role');
      localStorage.removeItem('edushield_user');
    } catch (e) {}
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {role && (
        <Navbar
          user={user}
          role={role}
          onLogout={handleLogout}
        />
      )}

      <main style={{ flex: 1 }}>
        {!role ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : role === 'student' ? (
          <StudentPortal
            student={user}
            onRefresh={() => {}}
          />
        ) : (
          <FacultyPortal
            faculty={user}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        background: 'rgba(11, 15, 25, 0.95)'
      }}>
        EduShield AI • AI-Based Academic Risk Prediction & Personalized Intervention System • FUSIONX 1.0 Hackathon Prototype
      </footer>
    </div>
  );
}

export default App;
