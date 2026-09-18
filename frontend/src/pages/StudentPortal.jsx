import React, { useState, useEffect } from 'react';
import { 
  BarChart3, AlertCircle, CheckCircle2, Clock, BookOpen, Send, 
  Calendar, FileText, Award, Download, UserCheck, ShieldAlert, 
  TrendingUp, TrendingDown, ArrowUpRight, CheckCircle, RefreshCw,
  ExternalLink, UploadCloud, FileCheck, Layers
} from 'lucide-react';
import { api } from '../services/api';

export default function StudentPortal({ student, onRefresh }) {
  const [activeTab, setActiveTab] = useState('academic'); // 'academic', 'od', 'leave', 'updates', 'activities', 'bonafide'
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states for OD
  const [odForm, setOdForm] = useState({
    from_date: '',
    to_date: '',
    purpose: '',
    location: '',
    event_details: '',
    document: null
  });
  const [odSubmitting, setOdSubmitting] = useState(false);
  const [odSuccessMsg, setOdSuccessMsg] = useState('');

  // Form states for Leave
  const [leaveForm, setLeaveForm] = useState({
    from_date: '',
    to_date: '',
    purpose: '',
    document: null
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSuccessMsg, setLeaveSuccessMsg] = useState('');

  // Form states for Extracurricular
  const [activityForm, setActivityForm] = useState({
    activity_type: 'Hackathon',
    event_name: '',
    activity_date: '',
    description: '',
    participation_details: '',
    certificate: null
  });
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activitySuccessMsg, setActivitySuccessMsg] = useState('');

  // Applications & Class updates & Bonafide data
  const [applications, setApplications] = useState({ od_applications: [], leave_applications: [] });
  const [classUpdates, setClassUpdates] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  const [bonafidePurpose, setBonafidePurpose] = useState('Passport Application');
  const [customBonafidePurpose, setCustomBonafidePurpose] = useState('');
  const [generatedBonafide, setGeneratedBonafide] = useState(null);
  const [bonafideGenerating, setBonafideGenerating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStudentDashboard(student.reg_number);
      if (res.success) {
        setDashboardData(res);
      } else {
        setError(res.message);
      }

      // Load applications, updates, activities
      const [appRes, updatesRes, actRes] = await Promise.all([
        api.getStudentApplications(student.reg_number),
        api.getClassUpdates(),
        api.getStudentActivities(student.reg_number)
      ]);

      if (appRes.success) setApplications(appRes);
      if (updatesRes.success) setClassUpdates(updatesRes.class_updates);
      if (actRes.success) setActivitiesList(actRes.activities);

    } catch (err) {
      setError('Failed to fetch student data from backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [student.reg_number]);

  // Handle OD Submission
  const handleODSubmit = async (e) => {
    e.preventDefault();
    setOdSubmitting(true);
    setOdSuccessMsg('');
    try {
      const fd = new FormData();
      fd.append('reg_number', student.reg_number);
      fd.append('from_date', odForm.from_date);
      fd.append('to_date', odForm.to_date);
      fd.append('purpose', odForm.purpose);
      fd.append('location', odForm.location);
      fd.append('event_details', odForm.event_details);
      if (odForm.document) fd.append('document', odForm.document);

      const res = await api.applyOD(fd);
      if (res.success) {
        setOdSuccessMsg(res.message);
        setOdForm({ from_date: '', to_date: '', purpose: '', location: '', event_details: '', document: null });
        const appRes = await api.getStudentApplications(student.reg_number);
        if (appRes.success) setApplications(appRes);
      } else {
        alert(res.message || 'Error submitting OD');
      }
    } catch (err) {
      alert('Network error submitting OD');
    } finally {
      setOdSubmitting(false);
    }
  };

  // Handle Leave Submission
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveSubmitting(true);
    setLeaveSuccessMsg('');
    try {
      const fd = new FormData();
      fd.append('reg_number', student.reg_number);
      fd.append('from_date', leaveForm.from_date);
      fd.append('to_date', leaveForm.to_date);
      fd.append('purpose', leaveForm.purpose);
      if (leaveForm.document) fd.append('document', leaveForm.document);

      const res = await api.applyLeave(fd);
      if (res.success) {
        setLeaveSuccessMsg(res.message);
        setLeaveForm({ from_date: '', to_date: '', purpose: '', document: null });
        const appRes = await api.getStudentApplications(student.reg_number);
        if (appRes.success) setApplications(appRes);
      } else {
        alert(res.message || 'Error submitting Leave');
      }
    } catch (err) {
      alert('Network error submitting Leave');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Handle Activity Submission
  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    setActivitySubmitting(true);
    setActivitySuccessMsg('');
    try {
      const fd = new FormData();
      fd.append('reg_number', student.reg_number);
      fd.append('activity_type', activityForm.activity_type);
      fd.append('event_name', activityForm.event_name);
      fd.append('activity_date', activityForm.activity_date);
      fd.append('description', activityForm.description);
      fd.append('participation_details', activityForm.participation_details);
      if (activityForm.certificate) fd.append('certificate', activityForm.certificate);

      const res = await api.addExtracurricular(fd);
      if (res.success) {
        setActivitySuccessMsg(res.message);
        setActivityForm({ activity_type: 'Hackathon', event_name: '', activity_date: '', description: '', participation_details: '', certificate: null });
        const actRes = await api.getStudentActivities(student.reg_number);
        if (actRes.success) setActivitiesList(actRes.activities);
      } else {
        alert(res.message || 'Error submitting activity');
      }
    } catch (err) {
      alert('Network error submitting activity');
    } finally {
      setActivitySubmitting(false);
    }
  };

  // Handle Bonafide Generation
  const handleGenerateBonafide = async () => {
    const finalPurpose = bonafidePurpose === 'Other' ? customBonafidePurpose : bonafidePurpose;
    if (!finalPurpose.trim()) {
      alert('Please specify the purpose for the bonafide certificate.');
      return;
    }
    setBonafideGenerating(true);
    try {
      const res = await api.generateBonafide(student.reg_number, finalPurpose);
      if (res.success) {
        setGeneratedBonafide(res.certificate);
      } else {
        alert(res.message || 'Error generating certificate');
      }
    } catch (err) {
      alert('Network error generating bonafide certificate');
    } finally {
      setBonafideGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <RefreshCw size={36} className="spin" color="#38bdf8" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ color: '#fff', fontSize: '1.2rem' }}>Running AI Academic Risk Diagnostics...</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analyzing attendance, test marks, assignment delays, and performance slope.</p>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '24px' }} className="glass-panel">
        <div style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={24} />
          <span>{error || 'Failed to load dashboard data.'}</span>
        </div>
        <button onClick={loadData} className="btn btn-primary" style={{ marginTop: '16px' }}>Retry</button>
      </div>
    );
  }

  const { student: stu, academic_record: acad, risk_prediction: risk, intervention_plan: intervention, test_scores: tests, assignment_submissions: assignments } = dashboardData;

  const isHighRisk = risk.risk_level === 'HIGH';
  const isMedRisk = risk.risk_level === 'MEDIUM';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
      
      {/* 1. Student Identity Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)',
        borderLeft: isHighRisk ? '5px solid var(--risk-high-border)' : isMedRisk ? '5px solid var(--risk-med-border)' : '5px solid var(--risk-low-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#fff',
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
          }}>
            {stu.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{stu.name}</h2>
              <span style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#38bdf8',
                padding: '3px 10px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}>
                {stu.reg_number}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span><strong>Dept:</strong> {stu.department}</span>
              <span>•</span>
              <span><strong>Course:</strong> {stu.course}</span>
              <span>•</span>
              <span><strong>Year / Sem:</strong> Year {stu.year} (Sem {stu.semester})</span>
              <span>•</span>
              <span><strong>Mentor:</strong> {stu.mentor_name}</span>
            </div>
          </div>
        </div>

        {/* Real-time Risk Badge Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          background: isHighRisk ? 'rgba(239, 68, 68, 0.12)' : isMedRisk ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
          border: `1px solid ${isHighRisk ? 'var(--risk-high-border)' : isMedRisk ? 'var(--risk-med-border)' : 'var(--risk-low-border)'}`
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              AI Early Risk Assessment
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isHighRisk ? '#fca5a5' : isMedRisk ? '#fcd34d' : '#6ee7b7' }}>
              {risk.risk_level} RISK ({risk.risk_score}/100)
            </div>
          </div>
          <div className={`risk-badge ${isHighRisk ? 'risk-badge-high pulse-high-risk' : isMedRisk ? 'risk-badge-medium' : 'risk-badge-low'}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
            {risk.risk_level}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '6px',
        background: 'rgba(15, 23, 42, 0.7)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '24px',
        border: '1px solid var(--border-color)'
      }}>
        <button
          onClick={() => setActiveTab('academic')}
          className={`tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
        >
          <BarChart3 size={17} />
          <span>Academic Dashboard & AI Risk</span>
        </button>

        <button
          onClick={() => setActiveTab('od')}
          className={`tab-btn ${activeTab === 'od' ? 'active' : ''}`}
        >
          <Send size={17} />
          <span>Apply OD ({applications.od_applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className={`tab-btn ${activeTab === 'leave' ? 'active' : ''}`}
        >
          <Calendar size={17} />
          <span>Apply Leave ({applications.leave_applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('updates')}
          className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
        >
          <BookOpen size={17} />
          <span>Class Updates & Notes ({classUpdates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
        >
          <Award size={17} />
          <span>Extracurricular Activities ({activitiesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bonafide')}
          className={`tab-btn ${activeTab === 'bonafide' ? 'active' : ''}`}
        >
          <FileCheck size={17} />
          <span>Bonafide Certificate</span>
        </button>
      </div>

      {/* TAB CONTENT 1: ACADEMIC DASHBOARD & AI RISK */}
      {activeTab === 'academic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Key Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            
            {/* Attendance Card */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <span>Attendance Percentage</span>
                <Clock size={18} color={acad.attendance_pct < 75 ? '#ef4444' : '#10b981'} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: acad.attendance_pct < 75 ? '#f87171' : '#34d399' }}>
                {acad.attendance_pct}%
              </div>
              <div style={{
                marginTop: '10px',
                height: '6px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${acad.attendance_pct}%`,
                  height: '100%',
                  background: acad.attendance_pct < 65 ? '#ef4444' : acad.attendance_pct < 75 ? '#f59e0b' : '#10b981'
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                {acad.attendance_pct < 75 ? '⚠️ Shortage Warning (<75% min requirement)' : '✅ Optimal regular attendance'}
              </span>
            </div>

            {/* Test Average */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <span>Average Test Score</span>
                <FileText size={18} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: acad.avg_test_score < 50 ? '#f87171' : acad.avg_test_score < 70 ? '#fcd34d' : '#38bdf8' }}>
                {acad.avg_test_score}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Calculated across Mid-Term & Unit Assessments
              </div>
            </div>

            {/* Assignment Score & Delays */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <span>Assignments & Delays</span>
                <AlertCircle size={18} color={acad.submission_delays > 2 ? '#ef4444' : '#10b981'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{acad.avg_assignment_score}%</span>
                <span style={{ fontSize: '0.85rem', color: acad.submission_delays > 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>
                  ({acad.submission_delays} late)
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                {acad.submission_delays > 0 ? `${acad.submission_delays} assignment deadlines missed` : 'Zero submission delays'}
              </div>
            </div>

            {/* Academic Trend */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <span>Performance Trend</span>
                {acad.performance_trend === 'Improving' ? (
                  <TrendingUp size={18} color="#10b981" />
                ) : acad.performance_trend === 'Declining' ? (
                  <TrendingDown size={18} color="#ef4444" />
                ) : (
                  <Activity size={18} color="#f59e0b" />
                )}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: acad.performance_trend === 'Improving' ? '#34d399' : acad.performance_trend === 'Declining' ? '#f87171' : '#fcd34d' }}>
                {acad.performance_trend}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Trajectory across recent assessment cycles
              </div>
            </div>

          </div>

          {/* AI Risk Prediction & Detailed Contributing Factors Explanation */}
          <div className="glass-panel" style={{
            padding: '28px',
            border: `1px solid ${isHighRisk ? 'rgba(239, 68, 68, 0.4)' : isMedRisk ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            background: isHighRisk ? 'rgba(239, 68, 68, 0.05)' : isMedRisk ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={22} color={isHighRisk ? '#ef4444' : isMedRisk ? '#f59e0b' : '#10b981'} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    AI Early Risk Diagnostic & Explanation
                  </h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Early prediction computed prior to final exams based on multi-parameter academic vectors.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Computed Risk Score</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isHighRisk ? '#f87171' : isMedRisk ? '#fcd34d' : '#34d399' }}>
                    {risk.risk_score} / 100
                  </div>
                </div>
                <span className={`risk-badge ${isHighRisk ? 'risk-badge-high' : isMedRisk ? 'risk-badge-medium' : 'risk-badge-low'}`} style={{ fontSize: '0.9rem', padding: '8px 18px' }}>
                  {risk.risk_level} RISK
                </span>
              </div>
            </div>

            {/* Why the student received this risk level (Contributing Factors) */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 'var(--radius-md)', padding: '18px 20px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Primary Contributing Risk Factors (Why this risk rating was determined):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                {risk.risk_factors.map((factor, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <AlertCircle size={16} color={isHighRisk ? '#f87171' : isMedRisk ? '#fcd34d' : '#34d399'} style={{ marginTop: '3px', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.4' }}>{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Personalized Intervention Plan (PREDICT -> EXPLAIN -> INTERVENE -> MONITOR) */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={22} color="#8b5cf6" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    Personalized Academic Intervention Plan
                  </h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Targeted action items generated by the intervention engine to mitigate identified risk factors.
                </p>
              </div>
              {intervention.mentor_alerted && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  color: '#fca5a5',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}>
                  <UserCheck size={16} />
                  <span>Mentor Alert Dispatched to {stu.mentor_name}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {intervention.action_items.map((item, idx) => (
                <div key={idx} style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: item.priority === 'CRITICAL' ? '1px solid rgba(239, 68, 68, 0.4)' : item.priority === 'HIGH' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: item.priority === 'CRITICAL' ? '#f87171' : item.priority === 'HIGH' ? '#fcd34d' : '#94a3b8'
                      }}>
                        {item.category} • {item.priority}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.06)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)'
                      }}>
                        {item.action_type}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {item.recommendation}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: Active Action Item</span>
                    <button
                      onClick={() => alert(`Marked progress for: ${item.title}`)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      <CheckCircle size={13} />
                      <span>Log Progress</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Tests & Assignment History */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
            
            {/* Subject Test Scores Table */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BookOpen size={18} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Subject Assessment Records</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Assessment</th>
                      <th>Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.length > 0 ? (
                      tests.map((t, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{t.subject}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{t.test_name}</td>
                          <td style={{ fontWeight: 700, color: (t.obtained_marks / t.max_marks) < 0.5 ? '#f87171' : '#fff' }}>
                            {t.obtained_marks} / {t.max_marks}
                          </td>
                          <td>
                            {(t.obtained_marks / t.max_marks) < 0.5 ? (
                              <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>Needs Remediation</span>
                            ) : (
                              <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>Satisfactory</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No test records logged.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assignment Submissions Table */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <FileText size={18} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Assignment Submissions</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Subject & Title</th>
                      <th>Due Date</th>
                      <th>Delay</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.length > 0 ? (
                      assignments.map((a, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{a.subject}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.title}</div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{a.due_date}</td>
                          <td>
                            {a.delay_days > 0 ? (
                              <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.8rem' }}>+{a.delay_days} days late</span>
                            ) : (
                              <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.8rem' }}>On time</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {a.score !== null ? `${a.score}%` : 'Pending'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No assignment records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT 2: APPLY OD */}
      {activeTab === 'od' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          
          {/* OD Application Form */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Send size={22} color="#38bdf8" />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Apply for On-Duty (OD)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Submit official duty request with supporting documents.</p>
              </div>
            </div>

            {odSuccessMsg && (
              <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                <span>{odSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleODSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">From Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={odForm.from_date}
                    onChange={(e) => setOdForm({ ...odForm, from_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">To Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={odForm.to_date}
                    onChange={(e) => setOdForm({ ...odForm, to_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purpose of OD *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Hackathon Participation, Paper Presentation"
                  value={odForm.purpose}
                  onChange={(e) => setOdForm({ ...odForm, purpose: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location / Institution *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. IIT Madras, Chennai"
                  value={odForm.location}
                  onChange={(e) => setOdForm({ ...odForm, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event / Organization Details</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  placeholder="Brief description of event, team details, rounds, etc."
                  value={odForm.event_details}
                  onChange={(e) => setOdForm({ ...odForm, event_details: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supporting Document (Invitation / Brochure / Letter)</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={(e) => setOdForm({ ...odForm, document: e.target.files[0] })}
                />
              </div>

              <button
                type="submit"
                disabled={odSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
              >
                {odSubmitting ? 'Submitting Application...' : 'Submit OD Application'}
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* OD Applications History */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              My OD Applications History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '500px', overflowY: 'auto' }}>
              {applications.od_applications.length > 0 ? (
                applications.od_applications.map((item) => (
                  <div key={item.id} style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{item.purpose}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📍 {item.location}</div>
                      </div>
                      <span className={`risk-badge ${
                        item.status === 'Approved' ? 'risk-badge-low' : item.status === 'Rejected' ? 'risk-badge-high' : 'risk-badge-medium'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Dates: {item.from_date} to {item.to_date}
                    </div>

                    {item.event_details && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {item.event_details}
                      </p>
                    )}

                    {item.faculty_remarks && (
                      <div style={{ fontSize: '0.75rem', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', color: '#93c5fd' }}>
                        <strong>Faculty Remarks:</strong> {item.faculty_remarks}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  No OD applications submitted yet.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 3: APPLY LEAVE */}
      {activeTab === 'leave' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          
          {/* Leave Application Form */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Calendar size={22} color="#f59e0b" />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Apply for Leave</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Submit leave request for approval by faculty advisor.</p>
              </div>
            </div>

            {leaveSuccessMsg && (
              <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                <span>{leaveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleLeaveSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">From Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">To Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Purpose of Leave *</label>
                <textarea
                  rows="3"
                  required
                  className="form-textarea"
                  placeholder="Provide legitimate reason (medical, personal emergency, family event, etc.)"
                  value={leaveForm.purpose}
                  onChange={(e) => setLeaveForm({ ...leaveForm, purpose: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supporting Document (e.g. Medical Certificate, if any)</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={(e) => setLeaveForm({ ...leaveForm, document: e.target.files[0] })}
                />
              </div>

              <button
                type="submit"
                disabled={leaveSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
              >
                {leaveSubmitting ? 'Submitting Leave...' : 'Submit Leave Application'}
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Leave History */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              My Leave Applications History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '500px', overflowY: 'auto' }}>
              {applications.leave_applications.length > 0 ? (
                applications.leave_applications.map((item) => (
                  <div key={item.id} style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>
                        {item.purpose}
                      </div>
                      <span className={`risk-badge ${
                        item.status === 'Approved' ? 'risk-badge-low' : item.status === 'Rejected' ? 'risk-badge-high' : 'risk-badge-medium'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Duration: {item.from_date} to {item.to_date}
                    </div>

                    {item.faculty_remarks && (
                      <div style={{ fontSize: '0.75rem', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', color: '#93c5fd' }}>
                        <strong>Faculty Remarks:</strong> {item.faculty_remarks}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  No leave applications recorded.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 4: GENERAL CLASS UPDATES & LECTURE NOTES */}
      {activeTab === 'updates' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={24} color="#38bdf8" />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>General Class Updates & Study Materials</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Faculty published daily class summaries, topics covered, and downloadable lecture notes for all students.
              </p>
            </div>
            <button onClick={loadData} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
              <RefreshCw size={15} />
              <span>Refresh Updates</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
            {classUpdates.length > 0 ? (
              classUpdates.map((update) => (
                <div key={update.id} style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                        {update.subject}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        📅 {update.update_date}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                      {update.topic}
                    </h4>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>
                      {update.description}
                    </p>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Published by: <strong>{update.faculty_name}</strong> ({update.department})
                    </div>
                  </div>

                  {update.document_path ? (
                    <a
                      href={update.document_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
                    >
                      <Download size={15} />
                      <span>Download Lecture Notes / PDF</span>
                    </a>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                      No attachment provided for this lecture update.
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ colSpan: '2', textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
                No class updates published yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: EXTRACURRICULAR ACTIVITY MODULE */}
      {activeTab === 'activities' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          
          {/* Add Activity Form */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Award size={22} color="#8b5cf6" />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Add Extracurricular Activity</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Upload proof certificate for faculty verification to make it an official record.
                </p>
              </div>
            </div>

            {activitySuccessMsg && (
              <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                <span>{activitySuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleActivitySubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Activity Type *</label>
                  <select
                    className="form-select"
                    value={activityForm.activity_type}
                    onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value })}
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Internship">Internship</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Project">Project</option>
                    <option value="Competition">Competition</option>
                    <option value="Other">Other Activity</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Activity Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={activityForm.activity_date}
                    onChange={(e) => setActivityForm({ ...activityForm, activity_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Event / Organization Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. FUSIONX Hackathon, Zoho Corp, IEEE Conference"
                  value={activityForm.event_name}
                  onChange={(e) => setActivityForm({ ...activityForm, event_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Participation Details / Achievement</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 1st Place Winner, Completed 8-week Cloud Internship"
                  value={activityForm.participation_details}
                  onChange={(e) => setActivityForm({ ...activityForm, participation_details: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Learnings</label>
                <textarea
                  rows="2"
                  className="form-textarea"
                  placeholder="Key contributions and technologies used"
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Certificate / Proof Upload (PDF / Image)</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={(e) => setActivityForm({ ...activityForm, certificate: e.target.files[0] })}
                />
              </div>

              <button
                type="submit"
                disabled={activitySubmitting}
                className="btn btn-accent"
                style={{ width: '100%', marginTop: '10px' }}
              >
                {activitySubmitting ? 'Uploading Activity...' : 'Submit for Faculty Verification'}
                <UploadCloud size={16} />
              </button>
            </form>
          </div>

          {/* Verified Extracurricular Records */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Extracurricular Portfolio Transcript
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Flow: Student Upload → Faculty Verification → Official Verified Record.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '520px', overflowY: 'auto' }}>
              {activitiesList.length > 0 ? (
                activitiesList.map((item) => (
                  <div key={item.id} style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
                          {item.activity_type}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{item.event_name}</div>
                      </div>
                      <span className={`risk-badge ${
                        item.verification_status === 'Verified' ? 'risk-badge-low' : item.verification_status === 'Rejected' ? 'risk-badge-high' : 'risk-badge-medium'
                      }`}>
                        {item.verification_status === 'Verified' ? '✓ Verified Record' : item.verification_status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Date: {item.activity_date}
                    </div>

                    {item.participation_details && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                        🏆 {item.participation_details}
                      </div>
                    )}

                    {item.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        {item.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      {item.certificate_path ? (
                        <a href={item.certificate_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={13} />
                          <span>View Certificate Proof</span>
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No file attached</span>
                      )}
                      {item.faculty_remarks && (
                        <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>Note: {item.faculty_remarks}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
                  No extracurricular activities added yet.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 6: BONAFIDE CERTIFICATE GENERATOR */}
      {activeTab === 'bonafide' && (
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <FileCheck size={28} color="#38bdf8" />
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>Instant Bonafide Certificate Generator</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Select purpose to generate official verified certificate populated with institutional records.
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
            <div className="form-group">
              <label className="form-label">Select Purpose of Bonafide Certificate *</label>
              <select
                className="form-select"
                value={bonafidePurpose}
                onChange={(e) => setBonafidePurpose(e.target.value)}
              >
                <option value="Passport Application & Police Verification">Passport Application & Police Verification</option>
                <option value="Education Bank Loan Application (SBI/HDFC/Canara)">Education Bank Loan Application</option>
                <option value="National / State Scholarship Verification">National / State Scholarship Verification</option>
                <option value="Student Bus / Train Concession Pass">Student Bus / Train Concession Pass</option>
                <option value="Off-Campus Internship / Industrial Training">Off-Campus Internship / Industrial Training</option>
                <option value="Other">Other Purpose (Specify Below)</option>
              </select>
            </div>

            {bonafidePurpose === 'Other' && (
              <div className="form-group">
                <label className="form-label">Enter Custom Purpose *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Specify purpose..."
                  value={customBonafidePurpose}
                  onChange={(e) => setCustomBonafidePurpose(e.target.value)}
                />
              </div>
            )}

            <button
              onClick={handleGenerateBonafide}
              disabled={bonafideGenerating}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px', padding: '12px' }}
            >
              {bonafideGenerating ? 'Generating Certificate...' : 'Generate Official Bonafide Certificate'}
              <FileCheck size={18} />
            </button>
          </div>

          {/* Generated Printable Bonafide Certificate Preview */}
          {generatedBonafide && (
            <div style={{
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              padding: '40px 48px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              border: '6px double #1e293b',
              marginTop: '28px',
              position: 'relative'
            }}>
              {/* Institution Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e3a8a' }}>
                  EduShield Institute of Engineering & Technology
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#475569' }}>
                  (Approved by AICTE, Affiliated to State Technological University)
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Tech Park Campus, Chennai, Tamil Nadu — 600025
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '24px', fontWeight: 600 }}>
                <span>Ref: <strong>{generatedBonafide.certificate_number}</strong></span>
                <span>Date: <strong>{generatedBonafide.issue_date}</strong></span>
              </div>

              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, textDecoration: 'underline', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  BONAFIDE CERTIFICATE
                </h3>
              </div>

              {/* Certificate Body */}
              <p style={{ fontSize: '1rem', lineHeight: '2.0', textAlign: 'justify', marginBottom: '32px' }}>
                This is to certify that <strong>{generatedBonafide.student_name}</strong> (Registration No: <strong>{generatedBonafide.reg_number}</strong>) is a bonafide student of this institution, currently studying in <strong>Year {generatedBonafide.year} (Semester {generatedBonafide.semester})</strong> of the <strong>{generatedBonafide.course} ({generatedBonafide.department})</strong> program during the academic year <strong>{generatedBonafide.academic_year}</strong>.
              </p>

              <p style={{ fontSize: '1rem', lineHeight: '2.0', textAlign: 'justify', marginBottom: '40px' }}>
                This certificate is issued on the student's request for the specific purpose of <strong>{generatedBonafide.purpose}</strong>.
              </p>

              {/* Signature Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px', paddingTop: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Seal of the Institution</div>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed #94a3b8', margin: '8px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                    OFFICIAL SEAL
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'cursive', fontSize: '1.1rem', color: '#1e3a8a', marginBottom: '4px' }}>
                    Dr. S. K. Narayanan
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Principal & Academic Dean</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>EduShield Institute of Technology</div>
                </div>
              </div>

              {/* Print / Download Button */}
              <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  <Download size={16} />
                  <span>Print / Save Bonafide PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
