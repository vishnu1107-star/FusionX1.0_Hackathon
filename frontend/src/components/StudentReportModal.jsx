import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Award, Clock, FileText, Download, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function StudentReportModal({ student, onClose }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student?.reg_number) {
      setLoading(true);
      api.getStudentFullReport(student.reg_number)
        .then(res => {
          if (res.success) {
            setReportData(res.data);
          }
        })
        .catch(err => console.error("Error fetching report:", err))
        .finally(() => setLoading(false));
    }
  }, [student]);

  if (!student) return null;

  const handleDownload = () => {
    api.downloadStudentReportPdf(student.reg_number);
  };

  const isHighRisk = student.risk_level === 'HIGH';
  const isMedRisk = student.risk_level === 'MEDIUM';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '32px', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{student.name}</h2>
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-blue)', padding: '2px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                {student.reg_number}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {student.department} • {student.course} • Year {student.year} (Sem {student.semester})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`risk-badge ${isHighRisk ? 'risk-badge-high' : isMedRisk ? 'risk-badge-medium' : 'risk-badge-low'}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              {student.risk_level} RISK ({student.risk_score}/100)
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>
            Loading complete student profile...
          </div>
        ) : reportData ? (
          <>
            {/* Academic Diagnostics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attendance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: reportData.academic.attendance_pct < 75 ? '#f87171' : '#34d399' }}>
                  {reportData.academic.attendance_pct}%
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Test Score</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  {reportData.academic.avg_test_score}%
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assignment Delays</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: reportData.academic.submission_delays > 0 ? '#f87171' : '#34d399' }}>
                  {reportData.academic.submission_delays} late
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Performance Trend</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: reportData.academic.performance_trend === 'Improving' ? '#34d399' : reportData.academic.performance_trend === 'Declining' ? '#f87171' : '#fcd34d' }}>
                  {reportData.academic.performance_trend}
                </div>
              </div>
            </div>

            {/* OD and Leave Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Calendar size={18} color="#38bdf8" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>OD Summary</h4>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  {reportData.od_summary.total_approved_days} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>Approved Days</span>
                </div>
                {reportData.od_summary.details.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Latest: {reportData.od_summary.details[0].purpose} ({reportData.od_summary.details[0].status})
                  </div>
                )}
              </div>

              <div style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileText size={18} color="#8b5cf6" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Leave Summary</h4>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                  {reportData.leave_summary.total_approved_days} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>Approved Days</span>
                </div>
                {reportData.leave_summary.details.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Latest: {reportData.leave_summary.details[0].purpose} ({reportData.leave_summary.details[0].status})
                  </div>
                )}
              </div>
            </div>

            {/* Extracurricular Activities */}
            {reportData.extracurriculars && reportData.extracurriculars.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Award size={18} color="#10b981" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Extracurricular Achievements
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reportData.extracurriculars.map((ex, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ex.event_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ex.type} • {ex.date}</div>
                      </div>
                      <span className={`status-badge status-${ex.status.toLowerCase()}`}>{ex.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contributing Risk Factors */}
            <div style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: isHighRisk ? 'rgba(239, 68, 68, 0.08)' : isMedRisk ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${isHighRisk ? 'rgba(239, 68, 68, 0.3)' : isMedRisk ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <ShieldAlert size={18} color={isHighRisk ? '#ef4444' : isMedRisk ? '#f59e0b' : '#10b981'} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  AI Model Risk Diagnostic Reasons:
                </h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reportData.academic.risk_factors && reportData.academic.risk_factors.map((factor, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#e2e8f0' }}>
                    <span style={{ color: isHighRisk ? '#f87171' : isMedRisk ? '#fcd34d' : '#34d399' }}>•</span>
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Personalized Interventions Plan */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Award size={18} color="#8b5cf6" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Personalized Intervention & Remedial Roadmap:
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {reportData.academic.interventions && reportData.academic.interventions.map((item, idx) => (
                  <div key={idx} style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: item.priority === 'CRITICAL' ? '#f87171' : item.priority === 'HIGH' ? '#fcd34d' : '#94a3b8' }}>
                        {item.category} • {item.priority}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.action_type}</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>

          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#f87171' }}>
            Failed to load report data.
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleDownload} className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading || !reportData}>
            <Download size={16} />
            <span>Download Report (PDF)</span>
          </button>
          
          <button onClick={onClose} className="btn btn-secondary">
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
}
