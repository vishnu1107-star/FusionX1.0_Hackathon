import React, { useState } from 'react';
import { ArrowRight, AlertTriangle, Building, Shield, User } from 'lucide-react';
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

  return (
    <div className="login-page-subtle" style={{
      minHeight: '100vh',
      padding: '24px 16px',
      position: 'relative'
    }}>
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

      <div className="glass-panel login-card-subtle" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '36px',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="login-logo" style={{
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
          <h1 className="login-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            ARGUS <span style={{ color: 'var(--accent-blue)' }}>STUDENT 360</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            AI-Based Academic Risk Prediction & Personalized Intervention System
          </p>
        </div>

        <div className="login-role-toggle" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          padding: '6px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          border: '1px solid var(--border-color)'
        }}>
          <span className={`login-role-pill ${activeTab === 'faculty' ? 'faculty' : ''}`} />
          <button type="button" className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`} style={{ justifyContent: 'center' }} onClick={() => { setActiveTab('student'); setErrorMsg(''); }}>
            <User size={18} />
            <span>Student Login</span>
          </button>
          <button type="button" className={`tab-btn ${activeTab === 'faculty' ? 'active' : ''}`} style={{ justifyContent: 'center' }} onClick={() => { setActiveTab('faculty'); setErrorMsg(''); }}>
            <Building size={18} />
            <span>Admin / Faculty</span>
          </button>
        </div>

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

        {activeTab === 'student' ? (
          <div>
            <form onSubmit={handleStudentSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="regNumberInput">Enter Registration Number</label>
                <input id="regNumberInput" type="text" className="form-input login-field" placeholder="Enter your registration number" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} autoFocus />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Students sign in using only their official registration identifier.
                </span>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary login-submit-button" style={{ width: '100%', marginTop: '8px', padding: '12px' }}>
                {loading ? 'Analyzing...' : 'Sign In as Student'}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        ) : (
          <div>
            <form onSubmit={handleFacultySubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="facultyIdInput">Faculty Advisor ID</label>
                <input id="facultyIdInput" type="text" className="form-input login-field" placeholder="e.g. FAC001" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Default Faculty: Dr. Arvind Swaminathan (Information Technology)
                </span>
              </div>
              <button type="submit" disabled={loading} className="btn btn-accent login-submit-button" style={{ width: '100%', marginTop: '8px', padding: '12px' }}>
                {loading ? 'Analyzing...' : 'Enter Faculty Dashboard'}
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
