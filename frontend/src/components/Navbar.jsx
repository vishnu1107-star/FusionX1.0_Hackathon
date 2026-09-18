import React, { useEffect, useState } from 'react';
import {
  Activity, Award, BarChart3, BookOpen, Calendar, ChevronLeft, ChevronRight,
  ClipboardCheck, FileCheck, LogOut, Menu, Send, Shield, ShieldAlert, UploadCloud, X
} from 'lucide-react';
import { api } from '../services/api';

const studentItems = [
  { id: 'academic', label: 'Academic Dashboard & AI Risk', icon: BarChart3 },
  { id: 'od', label: 'Apply OD', icon: Send, countKey: 'od' },
  { id: 'leave', label: 'Apply Leave', icon: Calendar, countKey: 'leave' },
  { id: 'updates', label: 'Class Updates & Notes', icon: BookOpen, countKey: 'updates' },
  { id: 'activities', label: 'Extracurricular Activities', icon: Award, countKey: 'activities' },
  { id: 'bonafide', label: 'Bonafide Certificate', icon: FileCheck }
];

const facultyItems = [
  { id: 'watchlist', label: 'Student Risk Watchlist', icon: ShieldAlert },
  { id: 'applications', label: 'OD & Leave Management', icon: Activity, countKey: 'applications' },
  { id: 'class_updates', label: 'General Class Updates', icon: BookOpen, countKey: 'updates' },
  { id: 'extracurricular', label: 'Extracurricular Verification', icon: Award, countKey: 'extracurricular' },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'upload_details', label: 'Upload Details', icon: UploadCloud }
];

export default function Navbar({ user, role, onLogout, activeTab, setActiveTab, collapsed, setCollapsed }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const items = role === 'faculty' ? facultyItems : studentItems;

  useEffect(() => {
    let cancelled = false;
    const loadCounts = async () => {
      try {
        if (role === 'student') {
          const [applications, updates, activities] = await Promise.all([
            api.getStudentApplications(user.reg_number),
            api.getClassUpdates(),
            api.getStudentActivities(user.reg_number)
          ]);
          if (!cancelled) {
            setCounts({
              od: applications.od_applications?.length || 0,
              leave: applications.leave_applications?.length || 0,
              updates: updates.class_updates?.length || 0,
              activities: activities.activities?.length || 0
            });
          }
        } else {
          const [applications, updates, activities] = await Promise.all([
            api.getAllApplications(),
            api.getClassUpdates(),
            api.getFacultyExtracurricularList()
          ]);
          if (!cancelled) {
            setCounts({
              applications: applications.applications?.filter((item) => item.status === 'Pending').length || 0,
              updates: updates.class_updates?.length || 0,
              extracurricular: activities.activities?.filter((item) => item.verification_status === 'Pending').length || 0
            });
          }
        }
      } catch (error) {
        if (!cancelled) setCounts({});
      }
    };
    loadCounts();
    return () => { cancelled = true; };
  }, [role, user]);

  const initials = (user.name || (role === 'faculty' ? 'Faculty' : 'Student'))
    .split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  const navigate = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      <button className="mobile-sidebar-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark"><Shield size={21} /></div>
          <div className="sidebar-brand-copy">
            <strong>ARGUS <span>STUDENT 360</span></strong>
            <small>FUSIONX 1.0 PROTOTYPE</small>
          </div>
          <button className="sidebar-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          <button className="sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="sidebar-section-label">{role === 'faculty' ? 'Faculty workspace' : 'Student workspace'}</div>
        <nav className="sidebar-nav" aria-label="Portal navigation">
          {items.map(({ id, label, icon: Icon, countKey }) => (
            <button key={id} className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`} onClick={() => navigate(id)} title={collapsed ? label : undefined}>
              <Icon size={18} />
              <span className="sidebar-nav-label">{label}</span>
              {countKey && counts[countKey] > 0 && <span className="sidebar-count">{counts[countKey]}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-copy">
            <strong>{user.name}</strong>
            <span>{role === 'faculty' ? user.faculty_id : user.reg_number}</span>
          </div>
          <button className="sidebar-logout" onClick={onLogout} title="Switch role / logout"><LogOut size={17} /></button>
        </div>
      </aside>
    </>
  );
}
