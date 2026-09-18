import React, { useState } from 'react';
import { Shield, User, Award, BookOpen, AlertTriangle, CheckCircle, ArrowRight, Sparkles, Building } from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'faculty'
  const [regNumber, setRegNumber] = useState('');
  const [facultyId, setFacultyId] = useState('FAC001');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStudentSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!regNumber.trim()) {
      setErrorMsg('Please enter your Registration Number.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.studentLogin(regNumber.trim());
      if (res.success) {
        onLoginSuccess('student', res.student);
      } else {
        setErrorMsg(res.message || 'Student not found.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server. Make sure Flask is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacultySubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.facultyLogin(facultyId.trim() || 'FAC001');
      if (res.success) {
        onLoginSuccess('faculty', res.faculty);
      } else {
        setErrorMsg(res.message || 'Faculty authentication failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStudentLogin = (reg) => {
    setRegNumber(reg);
    setLoading(true);
    setErrorMsg('');
    api.studentLogin(reg).then(res => {
      if (res.success) {
        onLoginSuccess('student', res.student);
      } else {
        setErrorMsg(res.message);
      }
    }).catch(() => {
      setErrorMsg('Network error.');
    }).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      position: 'relative'
    }}>
      {/* Background Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '20%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      {/* Main Login Card */}
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '36px',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)',
            marginBottom: '16px'
          }}>
            <Shield size={34} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            EduShield <span style={{ color: 'var(--accent-blue)' }}>AI</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            AI-Based Academic Risk Prediction & Personalized Intervention System
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          padding: '6px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
            onClick={() => { setActiveTab('student'); setErrorMsg(''); }}
          >
            <User size={18} />
            <span>Student Login</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'faculty' ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
            onClick={() => { setActiveTab('faculty'); setErrorMsg(''); }}
          >
            <Building size={18} />
            <span>Admin / Faculty</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--risk-high-text)',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Student Login Form */}
        {activeTab === 'student' ? (
          <div>
            <form onSubmit={handleStudentSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="regNumberInput">
                  Enter Registration Number
                </label>
                <input
                  id="regNumberInput"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 23IT001, 23IT002, 23IT003"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  autoFocus
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Students sign in using only their official registration identifier.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px', padding: '12px' }}
              >
                {loading ? 'Analyzing Profile...' : 'Sign In as Student'}
                <ArrowRight size={18} />
              </button>
            </form>

            {/* Quick Demo Personas Selector for Hackathon Jury */}
            <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Sparkles size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1-Click Hackathon Demo Personas
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickStudentLogin('23IT002')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>23IT002 — Rahul Sharma</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Attendance: 58% | Tests: 42% | 5 Late Submissions</div>
                  </div>
                  <span className="risk-badge risk-badge-high">HIGH RISK</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickStudentLogin('23IT001')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>23IT001 — Ananya Mishra</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Attendance: 72% | Tests: 64% | 2 Late Submissions</div>
                  </div>
                  <span className="risk-badge risk-badge-medium">MEDIUM RISK</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickStudentLogin('23IT003')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>23IT003 — Karthik Ram</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Attendance: 91.5% | Tests: 84.5% | 0 Delays</div>
                  </div>
                  <span className="risk-badge risk-badge-low">LOW RISK</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Faculty Login Form */
          <div>
            <form onSubmit={handleFacultySubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="facultyIdInput">
                  Faculty Advisor ID
                </label>
                <input
                  id="facultyIdInput"
                  type="text"
                  className="form-input"
                  placeholder="e.g. FAC001"
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Default Faculty: Dr. Arvind Swaminathan (Information Technology)
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-accent"
                style={{ width: '100%', marginTop: '8px', padding: '12px' }}
              >
                {loading ? 'Authenticating...' : 'Enter Faculty Dashboard'}
                <ArrowRight size={18} />
              </button>
            </form>

            <div style={{ marginTop: '24px', padding: '14px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: '4px' }}>
                Faculty Authority Capabilities:
              </div>
              <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '18px', lineHeight: '1.6' }}>
                <li>Ranked student academic risk watchlist with diagnostic explanations</li>
                <li>Manual decision on OD & Leave requests with full risk context</li>
                <li>Publish general academic class updates & lecture notes for all students</li>
                <li>Verify uploaded student extracurricular activity certificates</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
