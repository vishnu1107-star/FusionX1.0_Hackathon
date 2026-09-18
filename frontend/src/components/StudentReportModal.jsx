import React from 'react';
import { X, ShieldAlert, Award, Clock, FileText, UserCheck, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Activity, BookOpen } from 'lucide-react';

export default function StudentReportModal({ student, onClose }) {
  if (!student) return null;

  const isHighRisk = student.risk_level === 'HIGH';
  const isMedRisk = student.risk_level === 'MEDIUM';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '32px', maxWidth: '850px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{student.name}</h2>
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
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

        {/* Academic Diagnostics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attendance</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: student.attendance_pct < 75 ? '#f87171' : '#34d399' }}>
              {student.attendance_pct}%
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Test Score</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>
              {student.avg_test_score}%
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assignment Delays</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: student.submission_delays > 0 ? '#f87171' : '#34d399' }}>
              {student.submission_delays} late
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Performance Trend</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: student.performance_trend === 'Improving' ? '#34d399' : student.performance_trend === 'Declining' ? '#f87171' : '#fcd34d' }}>
              {student.performance_trend}
            </div>
          </div>
        </div>

        {/* Contributing Risk Factors (Why the student received this risk level) */}
        <div style={{
          padding: '18px',
          borderRadius: 'var(--radius-md)',
          background: isHighRisk ? 'rgba(239, 68, 68, 0.08)' : isMedRisk ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: `1px solid ${isHighRisk ? 'rgba(239, 68, 68, 0.3)' : isMedRisk ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldAlert size={18} color={isHighRisk ? '#ef4444' : isMedRisk ? '#f59e0b' : '#10b981'} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
              AI Model Risk Diagnostic Reasons:
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {student.risk_factors && student.risk_factors.map((factor, idx) => (
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
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
              Personalized Intervention & Remedial Roadmap:
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {student.action_items && student.action_items.map((item, idx) => (
              <div key={idx} style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: item.priority === 'CRITICAL' ? '#f87171' : item.priority === 'HIGH' ? '#fcd34d' : '#94a3b8' }}>
                    {item.category} • {item.priority}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.action_type}</span>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{item.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.recommendation}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
}
