"""
EduShield AI - Personalized Academic Intervention Engine
Generates tailored, actionable, and topic-specific remedial intervention plans.
"""

class InterventionEngine:
    @staticmethod
    def generate_intervention_plan(student_data, risk_analysis):
        """
        Generates structured, step-by-step personalized intervention recommendations.
        """
        risk_level = risk_analysis.get('risk_level', 'LOW')
        att = float(student_data.get('attendance_pct', 85.0))
        test = float(student_data.get('avg_test_score', 75.0))
        delays = int(student_data.get('submission_delays', 0))
        math_score = float(student_data.get('math_score', 75.0))
        dbms_score = float(student_data.get('dbms_score', 75.0))
        os_score = float(student_data.get('os_score', 75.0))
        dsa_score = float(student_data.get('dsa_score', 75.0))
        mentor = student_data.get('mentor_name', 'Faculty Mentor')

        action_items = []
        mentor_alerted = False

        # 1. Attendance Interventions
        if att < 65:
            classes_needed = int(max(1, (75 * 60 - att * 60) / 25))
            action_items.append({
                'category': 'Attendance Recovery',
                'priority': 'CRITICAL',
                'title': f'Mandatory Attendance Recovery Plan (Current: {att:.1f}%)',
                'recommendation': f'Attend the next {classes_needed} consecutive lecture hours without absence to cross the mandatory 75% institutional threshold.',
                'action_type': 'Goal',
                'icon': 'clock'
            })
            action_items.append({
                'category': 'Faculty Mentorship',
                'priority': 'HIGH',
                'title': f'Schedule 1-on-1 Mentoring with {mentor}',
                'recommendation': f'Automated alert sent to mentor ({mentor}) for an academic counseling session regarding attendance deficit.',
                'action_type': 'Meeting',
                'icon': 'user-check'
            })
            mentor_alerted = True
        elif att < 75:
            action_items.append({
                'category': 'Attendance Monitoring',
                'priority': 'MEDIUM',
                'title': f'Improve Attendance Margin (Current: {att:.1f}%)',
                'recommendation': 'Maintain regular attendance in the upcoming two weeks to prevent shortage detention warning.',
                'action_type': 'Advice',
                'icon': 'calendar'
            })

        # 2. Subject-Specific Academic Interventions
        subject_scores = [
            ('Discrete Mathematics', math_score, 'Unit 2: Recurrence Relations & Graph Theory', 'Revise homogeneous recurrence equations and practice 15 past exam questions.'),
            ('Operating Systems', os_score, 'Unit 3: Deadlock & Banker\'s Algorithm', 'Review resource allocation graphs and complete simulation exercises.'),
            ('Database Management Systems', dbms_score, 'Unit 2: Normalization & BCNF', 'Study functional dependency decomposition and work through 3NF/BCNF test sheet.'),
            ('Data Structures & Algorithms', dsa_score, 'Unit 2: Tree Traversals & AVL Balance', 'Implement binary search tree balancing and dynamic programming basics.')
        ]

        # Sort by lowest score
        subject_scores.sort(key=lambda x: x[1])

        for subj, sc, topic, study_note in subject_scores:
            if sc < 50:
                action_items.append({
                    'category': 'Remedial Study',
                    'priority': 'CRITICAL',
                    'title': f'Remedial Focus: {subj} (Score: {sc:.1f}%)',
                    'recommendation': f'Priority Topic: {topic}. {study_note}',
                    'action_type': 'Study Material',
                    'resource_link': f'/materials?subject={subj.replace(" ", "_")}',
                    'icon': 'book-open'
                })
                action_items.append({
                    'category': 'Remedial Sessions',
                    'priority': 'HIGH',
                    'title': f'Attend {subj} Peer Tutoring & Faculty Clinic',
                    'recommendation': f'Enrolled into weekly remedial tutorial sessions on Tuesday & Thursday 4:30 PM.',
                    'action_type': 'Class',
                    'icon': 'users'
                })
            elif sc < 65:
                action_items.append({
                    'category': 'Academic Booster',
                    'priority': 'MEDIUM',
                    'title': f'Practice Reinforcement: {subj} (Score: {sc:.1f}%)',
                    'recommendation': f'Complete supplementary problem set on {topic}.',
                    'action_type': 'Practice',
                    'icon': 'edit-3'
                })

        # 3. Submission & Workflow Interventions
        if delays >= 3:
            action_items.append({
                'category': 'Submission Management',
                'priority': 'HIGH',
                'title': f'Resolve Assignment Backlog ({delays} Delays)',
                'recommendation': 'Utilize 48-hour submission buffer. Set automated reminders 2 days prior to all semester deadlines.',
                'action_type': 'Workflow',
                'icon': 'alert-circle'
            })
        elif delays >= 1:
            action_items.append({
                'category': 'Time Management',
                'priority': 'LOW',
                'title': 'Submission Schedule Adherence',
                'recommendation': 'Submit upcoming coursework at least 24 hours in advance to earn consistency credit.',
                'action_type': 'Advice',
                'icon': 'check-circle'
            })

        # 4. Low Risk / High Achiever Interventions
        if risk_level == 'LOW':
            action_items.append({
                'category': 'Advanced Growth',
                'priority': 'LOW',
                'title': 'Advanced Elective & Honors Track',
                'recommendation': 'Excellent academic standing! Consider competitive coding hackathons, research paper publishing, or industry internship track.',
                'action_type': 'Opportunity',
                'icon': 'award'
            })

        return {
            'risk_level': risk_level,
            'mentor_alerted': mentor_alerted,
            'total_actions': len(action_items),
            'action_items': action_items,
            'summary': f"Generated {len(action_items)} personalized intervention action items based on multi-parameter diagnostic assessment."
        }

intervention_engine = InterventionEngine()
