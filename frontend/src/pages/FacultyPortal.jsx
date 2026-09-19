import React, { useState, useEffect } from 'react';
import { 
  Users, AlertTriangle, CheckCircle, Clock, BookOpen, Send, 
  Calendar, FileText, Award, Eye, ThumbsUp, ThumbsDown, 
  RefreshCw, ShieldAlert, PlusCircle, ExternalLink, Check, X,
  FileCheck, Sparkles, Filter, ChevronRight, ClipboardCheck, UploadCloud
} from 'lucide-react';
import { api } from '../services/api';
import StudentReportModal from '../components/StudentReportModal';

export default function FacultyPortal({ faculty, activeTab, setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [applications, setApplications] = useState([]);
  const [classUpdates, setClassUpdates] = useState([]);
  const [extracurricularList, setExtracurricularList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Attendance Module
  const [attendanceOptions, setAttendanceOptions] = useState({ departments: [], years: [], sections: [], subjects: [] });
  const [attForm, setAttForm] = useState({ department: '', year: '', section: '', subject: '', date: new Date().toISOString().split('T')[0], period: '1' });
  const [attStudents, setAttStudents] = useState([]);
  const [attReview, setAttReview] = useState(null);
  const [attendanceSubTab, setAttendanceSubTab] = useState('mark');
  const [savingAtt, setSavingAtt] = useState(false);

  // New Class Update Form
  const [updateForm, setUpdateForm] = useState({
    subject: 'Database Management Systems',
    update_date: new Date().toISOString().split('T')[0],
    topic: '',
    description: '',
    document: null
  });
  const [publishing, setPublishing] = useState(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingDetails, setUploadingDetails] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const loadFacultyData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getFacultyStats(),
        api.getRiskWatchlist(),
        api.getAllApplications(),
        api.getClassUpdates(),
        api.getFacultyExtracurricularList(),
        api.getAttendanceOptions()
      ]);
      const [statsResult, watchResult, appResult, updatesResult, extraResult, attOptResult] = results;
      const statsRes = statsResult.status === 'fulfilled' ? statsResult.value : null;
      const watchRes = watchResult.status === 'fulfilled' ? watchResult.value : null;
      const appRes = appResult.status === 'fulfilled' ? appResult.value : null;
      const updatesRes = updatesResult.status === 'fulfilled' ? updatesResult.value : null;
      const extraRes = extraResult.status === 'fulfilled' ? extraResult.value : null;
      const attOptRes = attOptResult.status === 'fulfilled' ? attOptResult.value : null;

      if (statsRes?.success) setStats(statsRes.stats);
      if (watchRes?.success) setWatchlist(watchRes.watchlist);
      if (appRes?.success) setApplications(appRes.applications);
      if (updatesRes?.success) setClassUpdates(updatesRes.class_updates);
      if (extraRes?.success) setExtracurricularList(extraRes.activities);
      if (attOptRes && attOptRes.status === 'success') {
        setAttendanceOptions(attOptRes.data);
        setAttForm(prev => ({
          ...prev,
          department: attOptRes.data.departments[0] || '',
          year: attOptRes.data.years[0] || '',
          section: attOptRes.data.sections[0] || '',
          subject: attOptRes.data.subjects[0] || ''
        }));
      }
    } catch (err) {
      console.error("Failed to load faculty data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentDetailsUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile) {
      setUploadResult({ success: false, message: 'Select an .xlsx file before uploading.' });
      return;
    }

    setUploadingDetails(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const result = await api.uploadStudentDetails(formData);
      setUploadResult(result);
      if (result.success) {
        setUploadFile(null);
        event.target.reset();
        await loadFacultyData();
      }
    } catch (error) {
      setUploadResult({ success: false, message: 'Unable to connect to the upload service.' });
    } finally {
      setUploadingDetails(false);
    }
  };

  useEffect(() => {
    loadFacultyData();
  }, []);

  // Handle Attendance Fetch
  const handleFetchStudentsForAttendance = async () => {
    if(!attForm.department || !attForm.year || !attForm.section) return;
    try {
      const res = await api.getAttendanceStudents(attForm.department, attForm.year, attForm.section);
      if(res.status === 'success') {
        const studentsWithStatus = res.data.map(s => ({ ...s, status: 'Present' }));
        setAttStudents(studentsWithStatus);
      }
    } catch (err) { alert('Error fetching students'); }
  };

  const handleAttendanceStatusChange = (index, status) => {
    const updated = [...attStudents];
    updated[index].status = status;
    setAttStudents(updated);
  };

  const handleMarkAll = (status) => {
    setAttStudents(attStudents.map(s => ({ ...s, status })));
  };

  const handleSubmitAttendance = async () => {
    if(attStudents.length === 0) return;
    setSavingAtt(true);
    try {
      const payload = {
        faculty_id: faculty.faculty_id,
        subject: attForm.subject,
        date: attForm.date,
        period: parseInt(attForm.period),
        attendance: attStudents.map(s => ({ student_id: s.id, status: s.status }))
      };
      const res = await api.submitAttendance(payload);
      if(res.status === 'success') {
        alert('Attendance saved successfully! Risk profiles updated.');
        setAttStudents([]); // clear form
        loadFacultyData(); // refresh stats
      } else {
        alert(res.message || 'Failed to save attendance');
      }
    } catch(err) {
      alert('Error submitting attendance');
    } finally {
      setSavingAtt(false);
    }
  };

  const loadAttendanceReview = async () => {
    try {
      const res = await api.getAttendanceReview();
      if(res.status === 'success') setAttReview(res.data);
    } catch(e) {}
  };

  useEffect(() => {
    if(activeTab === 'attendance' && attendanceSubTab === 'review') {
      loadAttendanceReview();
    }
  }, [activeTab, attendanceSubTab]);

  // Handle Application Action (Approve / Reject)
  const handleApplicationAction = async (type, id, action) => {
    const remarks = prompt(`Enter optional remarks for ${action.toLowerCase()}ing this ${type} request:`, `${action} by Faculty Advisor`);
    if (remarks === null) return; // cancelled

    try {
      const res = await api.takeFacultyAction(type, id, action, remarks);
      if (res.success) {
        // Refresh application list and stats
        const appRes = await api.getAllApplications();
        if (appRes.success) setApplications(appRes.applications);
        const statsRes = await api.getFacultyStats();
        if (statsRes.success) setStats(statsRes.stats);
      } else {
        alert(res.message || 'Error processing action');
      }
    } catch (err) {
      alert('Network error while processing application');
    }
  };

  // Handle Extracurricular Verification
  const handleVerifyExtracurricular = async (actId, status) => {
    const remarks = prompt(`Enter verification note (e.g. "Certificate verified from official hackathon portal"):`, status === 'Verified' ? 'Approved & Validated' : 'Certificate unverified');
    if (remarks === null) return;

    try {
      const res = await api.verifyExtracurricular(actId, status, remarks);
      if (res.success) {
        const extraRes = await api.getFacultyExtracurricularList();
        if (extraRes.success) setExtracurricularList(extraRes.activities);
        const statsRes = await api.getFacultyStats();
        if (statsRes.success) setStats(statsRes.stats);
      } else {
        alert(res.message || 'Error updating activity status');
      }
    } catch (err) {
      alert('Network error verifying activity');
    }
  };

  // Handle Class Update Publication
  const handlePublishClassUpdate = async (e) => {
    e.preventDefault();
    setPublishing(true);
    setPublishSuccessMsg('');
    try {
      const fd = new FormData();
      fd.append('faculty_name', faculty.name);
      fd.append('department', faculty.department);
      fd.append('subject', updateForm.subject);
      fd.append('update_date', updateForm.update_date);
      fd.append('topic', updateForm.topic);
      fd.append('description', updateForm.description);
      if (updateForm.document) fd.append('document', updateForm.document);

      const res = await api.publishClassUpdate(fd);
      if (res.success) {
        setPublishSuccessMsg(res.message);
        setUpdateForm({
          subject: 'Database Management Systems',
          update_date: new Date().toISOString().split('T')[0],
          topic: '',
          description: '',
          document: null
        });
        const updatesRes = await api.getClassUpdates();
        if (updatesRes.success) setClassUpdates(updatesRes.class_updates);
      } else {
        alert(res.message || 'Error publishing update');
      }
    } catch (err) {
      alert('Network error publishing class update');
    } finally {
      setPublishing(false);
    }
  };

  const pendingApps = applications.filter(a => a.status === 'Pending');

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
          <RefreshCw size={14} className="spin" color="#8b5cf6" />
          <span>Loading live faculty intelligence...</span>
        </div>
      )}
      
      {/* 1. Header & Stats Overview Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '24px',
        background: 'var(--bg-card)',
        borderLeft: '5px solid #8b5cf6'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={22} color="#8b5cf6" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Faculty Academic Monitoring & Intervention Portal
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Faculty Advisor: <strong>{faculty.name}</strong> • {faculty.department} ({faculty.faculty_id})
            </p>
          </div>

          <button onClick={loadFacultyData} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            <RefreshCw size={15} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {/* 6 Metric Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '20px' }}>
            
            <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Students</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.total_students}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Enrolled in Dept</div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--risk-high-text)' }}>High Risk Students</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--risk-high-text)' }}>{stats.high_risk_students}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--risk-high-text)' }}>Immediate Intervention</div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#fcd34d' }}>Medium Risk Students</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--risk-med-text)' }}>{stats.medium_risk_students}</div>
              <div style={{ fontSize: '0.7rem', color: '#fcd34d' }}>Close Monitoring</div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--risk-low-text)' }}>Low Risk Students</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--risk-low-text)' }}>{stats.low_risk_students}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--risk-low-text)' }}>Satisfactory Progress</div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>Pending OD Requests</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{stats.pending_od_applications}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Awaiting Decision</div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)' }}>Pending Leave Requests</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{stats.pending_leave_applications}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Awaiting Decision</div>
            </div>

          </div>
        )}
      </div>

      {activeTab === 'upload_details' && (
        <div className="glass-panel" style={{ padding: '28px', maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
            <UploadCloud size={28} color="var(--accent-blue)" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Sync Academic ML Data</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                Update existing student academic records for risk prediction using the 6-column ML template.
              </p>
            </div>
          </div>

          <div style={{ padding: '18px', marginBottom: '20px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Required order: Registration Number, attendance_percentage, test_average, assignment_average, submission_delay_count, performance_trend.
            </p>
          </div>

          <form onSubmit={handleStudentDetailsUpload}>
            <label className="form-label" htmlFor="studentDetailsFile">Excel file (.xlsx)</label>
            <input id="studentDetailsFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="form-input" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
            <button type="submit" disabled={uploadingDetails} className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
              <UploadCloud size={17} />
              {uploadingDetails ? 'Uploading Details...' : 'Upload Excel Details'}
            </button>
          </form>

          {uploadResult && (
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: 'var(--radius-md)', border: `1px solid ${uploadResult.success ? '#86efac' : '#fca5a5'}`, background: uploadResult.success ? '#f0fdf4' : '#fef2f2', color: uploadResult.success ? '#166534' : '#991b1b' }}>
              <strong>{uploadResult.message}</strong>
              {uploadResult.summary && <div style={{ marginTop: '7px', fontSize: '0.82rem' }}>Processed: {uploadResult.summary.processed} | Added: {uploadResult.summary.added} | Skipped: {uploadResult.summary.skipped}</div>}
              {uploadResult.skipped_rows?.length > 0 && (
                <div style={{ marginTop: '12px', fontSize: '0.8rem' }}>
                  <strong>Skipped rows</strong>
                  <ul style={{ margin: '6px 0 0 18px' }}>
                    {uploadResult.skipped_rows.map((item, index) => <li key={`${item.row}-${index}`}>Row {item.row}{item.registration_number ? ` (${item.registration_number})` : ''}: {item.reason}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB CONTENT 1: RANKED STUDENT RISK WATCHLIST */}
      {activeTab === 'watchlist' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Ranked Academic Risk Watchlist
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Students automatically ranked by AI calculated risk severity before final results. Click a student to view full diagnostics.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="risk-badge risk-badge-high">High: {stats?.high_risk_students || 0}</span>
              <span className="risk-badge risk-badge-medium">Medium: {stats?.medium_risk_students || 0}</span>
              <span className="risk-badge risk-badge-low">Low: {stats?.low_risk_students || 0}</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank & Student</th>
                  <th>Attendance</th>
                  <th>Test Average</th>
                  <th>Assignments</th>
                  <th>Delays</th>
                  <th>Trend</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((stu, index) => {
                  const isHigh = stu.risk_level === 'HIGH';
                  const isMed = stu.risk_level === 'MEDIUM';

                  return (
                    <tr
                      key={stu.id}
                      style={{
                        background: isHigh ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedStudent(stu)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isHigh ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-secondary)',
                            color: isHigh ? 'var(--risk-high-text)' : 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {index + 1}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{stu.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>{stu.reg_number} • {stu.course}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 700, color: stu.attendance_pct < 75 ? 'var(--risk-high-text)' : 'var(--risk-low-text)' }}>
                          {stu.attendance_pct}%
                        </span>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600, color: stu.avg_test_score < 50 ? 'var(--risk-high-text)' : 'var(--text-primary)' }}>
                          {stu.avg_test_score}%
                        </span>
                      </td>

                      <td>
                        <span style={{ color: 'var(--text-secondary)' }}>{stu.avg_assignment_score}%</span>
                      </td>

                      <td>
                        {stu.submission_delays > 0 ? (
                          <span style={{ color: 'var(--risk-high-text)', fontWeight: 600 }}>{stu.submission_delays} late</span>
                        ) : (
                          <span style={{ color: 'var(--risk-low-text)' }}>0</span>
                        )}
                      </td>

                      <td>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: stu.performance_trend === 'Improving' ? '#34d399' : stu.performance_trend === 'Declining' ? '#f87171' : '#fcd34d'
                        }}>
                          {stu.performance_trend}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isHigh ? '#f87171' : isMed ? '#fcd34d' : '#34d399' }}>
                          {stu.risk_score}/100
                        </span>
                      </td>

                      <td>
                        <span className={`risk-badge ${isHigh ? 'risk-badge-high' : isMed ? 'risk-badge-medium' : 'risk-badge-low'}`}>
                          {stu.risk_level}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedStudent(stu); }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          <Eye size={14} />
                          <span>Full Report</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: OD & LEAVE MANAGEMENT */}
      {activeTab === 'applications' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                OD & Leave Application Management
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Review duty and leave requests. The system presents student academic context (Attendance & Risk), while faculty makes the final Approve / Reject decision.
              </p>
            </div>
            <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-blue)', padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
              {pendingApps.length} Pending Actions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {applications.length > 0 ? (
              applications.map((app) => {
                const isHigh = app.risk_level === 'HIGH';
                const isMed = app.risk_level === 'MEDIUM';

                return (
                  <div key={`${app.application_type}-${app.id}`} style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    {/* Header line */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: app.application_type === 'OD' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: app.application_type === 'OD' ? '#38bdf8' : '#fbbf24',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                          {app.application_type} Application
                        </span>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {app.student_name} ({app.student_reg})
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {app.department} • Year {app.year} (Sem {app.semester})
                          </div>
                        </div>
                      </div>

                      {/* Academic Risk Context Badge for Faculty Decision Assistance */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ textAlign: 'right', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Current Attendance: </span>
                          <strong style={{ color: app.attendance_pct < 75 ? '#f87171' : '#34d399' }}>{app.attendance_pct}%</strong>
                        </div>
                        <span className={`risk-badge ${isHigh ? 'risk-badge-high' : isMed ? 'risk-badge-medium' : 'risk-badge-low'}`}>
                          {app.risk_level} RISK
                        </span>
                        <span className={`risk-badge ${
                          app.status === 'Approved' ? 'risk-badge-low' : app.status === 'Rejected' ? 'risk-badge-high' : 'risk-badge-medium'
                        }`} style={{ padding: '4px 10px' }}>
                          Status: {app.status}
                        </span>
                      </div>
                    </div>

                    {/* Application Details Body */}
                    <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem', marginBottom: '8px' }}>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Purpose:</strong> <span style={{ color: 'var(--text-primary)' }}>{app.purpose}</span></div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Dates:</strong> <span style={{ color: 'var(--accent-blue)' }}>{app.from_date} to {app.to_date}</span></div>
                        {app.application_type === 'OD' && (
                          <div><strong style={{ color: 'var(--text-muted)' }}>Location:</strong> <span style={{ color: 'var(--text-primary)' }}>{app.location}</span></div>
                        )}
                      </div>

                      {app.event_details && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          <strong>Event Summary:</strong> {app.event_details}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        {app.document_path ? (
                          <a href={app.document_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                            <ExternalLink size={13} />
                            <span>View Supporting Document Proof</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No supporting attachment</span>
                        )}
                        {app.faculty_remarks && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Faculty Note: {app.faculty_remarks}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Faculty Action Buttons */}
                    {app.status === 'Pending' ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          onClick={() => handleApplicationAction(app.application_type, app.id, 'Approved')}
                          className="btn btn-success"
                          style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                        >
                          <ThumbsUp size={15} />
                          <span>APPROVE</span>
                        </button>
                        <button
                          onClick={() => handleApplicationAction(app.application_type, app.id, 'Rejected')}
                          className="btn btn-danger"
                          style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                        >
                          <ThumbsDown size={15} />
                          <span>REJECT</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Decision completed: Marked as <strong>{app.status}</strong>
                      </div>
                    )}

                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
                No applications found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: GENERAL CLASS UPDATE MODULE */}
      {activeTab === 'class_updates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          
          {/* Publish Update Form */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <PlusCircle size={22} color="#38bdf8" />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Today's Class Update</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Publish general academic lecture notes and topics covered for all students.
                </p>
              </div>
            </div>

            {publishSuccessMsg && (
              <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: 'var(--risk-low-text)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                <span>{publishSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handlePublishClassUpdate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <select
                    className="form-select"
                    value={updateForm.subject}
                    onChange={(e) => setUpdateForm({ ...updateForm, subject: e.target.value })}
                  >
                    <option value="Database Management Systems">Database Management Systems</option>
                    <option value="Discrete Mathematics">Discrete Mathematics</option>
                    <option value="Operating Systems">Operating Systems</option>
                    <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                    <option value="Computer Networks">Computer Networks</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={updateForm.update_date}
                    onChange={(e) => setUpdateForm({ ...updateForm, update_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Topic / Topics Covered *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Normalization (1NF, 2NF, 3NF, BCNF)"
                  value={updateForm.topic}
                  onChange={(e) => setUpdateForm({ ...updateForm, topic: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Lecture Summary</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  placeholder="Explain key theorems, problems solved in class, homework hints, etc."
                  value={updateForm.description}
                  onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lecture Notes / PDF Attachment (Optional)</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={(e) => setUpdateForm({ ...updateForm, document: e.target.files[0] })}
                />
              </div>

              <button
                type="submit"
                disabled={publishing}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
              >
                {publishing ? 'Publishing Lecture Update...' : 'PUBLISH CLASS UPDATE'}
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Published Updates Feed */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Published General Academic Updates
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '520px', overflowY: 'auto' }}>
              {classUpdates.map((update) => (
                <div key={update.id} style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{update.subject}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{update.update_date}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {update.topic}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {update.description}
                  </p>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Published by {update.faculty_name}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 4: EXTRACURRICULAR ACTIVITY VERIFICATION */}
      {activeTab === 'extracurricular' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Extracurricular Activity Proof Verification
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Inspect student certificates and validate extracurricular records (Hackathons, Workshops, Internships, etc.).
              </p>
            </div>
            <span style={{ background: 'rgba(192, 132, 252, 0.15)', color: 'var(--accent-purple)', padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
              {extracurricularList.filter(e => e.verification_status === 'Pending').length} Pending Validation
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {extracurricularList.map((item) => (
              <div key={item.id} style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase' }}>
                        {item.activity_type}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                        {item.student_name} ({item.student_reg})
                      </span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {item.event_name}
                    </div>
                  </div>

                  <span className={`risk-badge ${
                    item.verification_status === 'Verified' ? 'risk-badge-low' : item.verification_status === 'Rejected' ? 'risk-badge-high' : 'risk-badge-medium'
                  }`}>
                    {item.verification_status}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <strong>Date:</strong> {item.activity_date} {item.participation_details && `• Achievement: ${item.participation_details}`}
                </div>

                {item.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {item.description}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  {item.certificate_path ? (
                    <a href={item.certificate_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                      <ExternalLink size={14} />
                      <span>Inspect Uploaded Certificate Proof</span>
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No certificate attached</span>
                  )}

                  {item.verification_status === 'Pending' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleVerifyExtracurricular(item.id, 'Verified')}
                        className="btn btn-success"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        <Check size={14} />
                        <span>Verify Record</span>
                      </button>
                      <button
                        onClick={() => handleVerifyExtracurricular(item.id, 'Rejected')}
                        className="btn btn-danger"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Record is <strong>{item.verification_status}</strong> {item.faculty_remarks && `(${item.faculty_remarks})`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: ATTENDANCE MODULE */}
      {activeTab === 'attendance' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <button 
              onClick={() => setAttendanceSubTab('mark')}
              style={{ background: 'none', border: 'none', color: attendanceSubTab === 'mark' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '1.05rem' }}
            >Mark Attendance</button>
            <button 
              onClick={() => setAttendanceSubTab('review')}
              style={{ background: 'none', border: 'none', color: attendanceSubTab === 'review' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '1.05rem' }}
            >Attendance Review</button>
          </div>

          {attendanceSubTab === 'mark' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={attForm.department} onChange={e => setAttForm({...attForm, department: e.target.value})}>
                    {attendanceOptions.departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-select" value={attForm.year} onChange={e => setAttForm({...attForm, year: e.target.value})}>
                    {attendanceOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <select className="form-select" value={attForm.section} onChange={e => setAttForm({...attForm, section: e.target.value})}>
                    {attendanceOptions.sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="form-select" value={attForm.subject} onChange={e => setAttForm({...attForm, subject: e.target.value})}>
                    {attendanceOptions.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={attForm.date} onChange={e => setAttForm({...attForm, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <select className="form-select" value={attForm.period} onChange={e => setAttForm({...attForm, period: e.target.value})}>
                    {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleFetchStudentsForAttendance} className="btn btn-secondary" style={{ marginBottom: '24px' }}>Load Students</button>

              {attStudents.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ color: 'var(--text-primary)' }}>Mark Attendance ({attStudents.length} Students)</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleMarkAll('Present')} className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Mark All Present</button>
                      <button onClick={() => handleMarkAll('Absent')} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Mark All Absent</button>
                    </div>
                  </div>
                  <table className="custom-table" style={{ marginBottom: '20px' }}>
                    <thead>
                      <tr>
                        <th>Reg No</th>
                        <th>Student Name</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attStudents.map((s, idx) => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.reg_number}</td>
                          <td>{s.name}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
                              <button 
                                onClick={() => handleAttendanceStatusChange(idx, 'Present')}
                                style={{ padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600, background: s.status === 'Present' ? '#10b981' : 'transparent', color: s.status === 'Present' ? '#fff' : 'var(--text-secondary)' }}
                              >Present</button>
                              <button 
                                onClick={() => handleAttendanceStatusChange(idx, 'Absent')}
                                style={{ padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600, background: s.status === 'Absent' ? '#ef4444' : 'transparent', color: s.status === 'Absent' ? '#fff' : 'var(--text-secondary)' }}
                              >Absent</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setAttStudents([])} className="btn btn-secondary">Reset / Cancel</button>
                    <button onClick={handleSubmitAttendance} disabled={savingAtt} className="btn btn-primary">
                      {savingAtt ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {attendanceSubTab === 'review' && attReview && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Students</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{attReview.total_students}</div>
                </div>
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Present Today</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--risk-low-text)' }}>{attReview.present_today}</div>
                </div>
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Absent Today</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--risk-high-text)' }}>{attReview.absent_today}</div>
                </div>
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overall Attendance</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{attReview.overall_pct}%</div>
                </div>
              </div>

              <h4 style={{ color: 'var(--risk-high-text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> HIGH ATTENTION: Low Attendance
              </h4>
              {attReview.low_attendance_students.length > 0 ? (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Reg No</th>
                      <th>Student Name</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attReview.low_attendance_students.map(s => (
                      <tr key={s.reg_number}>
                        <td style={{ fontWeight: 600 }}>{s.reg_number}</td>
                        <td>{s.name}</td>
                        <td style={{ fontWeight: 700, color: 'var(--risk-high-text)' }}>{s.attendance_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
                  No students with critically low attendance.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Deep-Dive Academic Report Diagnostics Modal */}
      {selectedStudent && (
        <StudentReportModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

    </div>
  );
}
