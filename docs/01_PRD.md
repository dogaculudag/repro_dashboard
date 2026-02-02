# Product Requirements Document (PRD)
# Repro Department File Tracking System (RDFTS)

**Version:** 1.0  
**Date:** February 2, 2026  
**Author:** Senior Full-Stack Architect

---

## 1. Executive Summary

The Repro Department File Tracking System (RDFTS) is a production-ready web application designed for a printing cylinder engraving company's Repro department. The system tracks **physical job files** across departments, measures time spent per department for bottleneck analysis, and reports employee performance and throughput.

**Key Value Propositions:**
- Prevents lost files through enforced handoff discipline
- Provides real-time visibility into file locations and ownership
- Enables data-driven bottleneck identification
- Supports performance measurement and SLA compliance

---

## 2. Problem Statement

### Current Challenges
1. Physical job files get lost or misplaced between departments
2. No visibility into where a file currently is or who has it
3. Cannot measure how long each department takes to process files
4. No accountability for handoffs between departments
5. Cannot identify bottlenecks in the workflow
6. Employee performance is not measurable

### Solution
A digital tracking system that:
- Enforces mandatory "takeover" (Devral) when receiving physical files
- Logs every transfer with timestamps
- Calculates time spent per department automatically
- Provides searchable file history and current location
- Generates performance and bottleneck reports

---

## 3. Assumptions

| # | Assumption | Rationale |
|---|------------|-----------|
| A1 | All employees have access to a computer/tablet to interact with the system | Required for real-time tracking |
| A2 | Files are uniquely identified by a human-readable file number | Standard practice in print industry |
| A3 | Customer approval happens outside the system (email/phone) but outcome is logged | System tracks internal workflow |
| A4 | Location slots are predefined and do not change frequently | Simplifies MVP implementation |
| A5 | Turkey timezone (Europe/Istanbul) is the operational timezone | Company location |
| A6 | After Customer OK, file goes directly to Quality (not back to Grafiker) | Streamlines workflow |
| A7 | Manager override is rare and requires explicit justification | Maintains ownership integrity |
| A8 | Virtual "Customer Approval" department has no user but tracks wait time | Measures external dependencies |
| A9 | One file can have multiple iteration labels (MG1, MG2, MG3...) over its lifecycle | Customer revision workflow |
| A10 | Transfer action records intent; Devral records actual receipt | Two-phase handoff |

---

## 4. User Personas

### 4.1 Bahar Hanım (Admin/Manager)
- **Role:** Department Manager
- **Goals:** Assign work fairly, monitor workload, identify bottlenecks, ensure SLA compliance
- **Pain Points:** Cannot see who has what, workload imbalance, no performance data
- **Key Features:** Assignment dashboard, workload charts, bottleneck alerts, override capability

### 4.2 Önrepro Staff
- **Role:** Pre-production preparation
- **Goals:** Create file records, input technical data, prepare files for design
- **Pain Points:** Files get lost after creation, no tracking of handoffs
- **Key Features:** File creation, KSM data entry, transfer to design, approval preparation

### 4.3 Grafiker (Repro Designer)
- **Role:** Design work on assigned files
- **Goals:** Know what's assigned, track own work, complete designs efficiently
- **Pain Points:** Unclear assignments, revision loops unclear, no performance visibility
- **Key Features:** My files view, takeover, design completion, revision handling

### 4.4 Kalite Staff (Quality Control)
- **Role:** Verify design quality and technical suitability
- **Goals:** Catch errors before production, provide clear feedback
- **Pain Points:** Files pile up, no tracking of rejection reasons
- **Key Features:** Queue view, OK/NOK with mandatory notes, transfer to Kolaj

### 4.5 Kolaj Staff (Collage/Assembly)
- **Role:** Final assembly and production preparation
- **Goals:** Complete final steps, send to production
- **Pain Points:** Unclear when files are ready, no completion tracking
- **Key Features:** Incoming queue, assembly work, mark as sent to production

---

## 5. Functional Requirements

### 5.1 User Management (FR-UM)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-UM-01 | System shall support user authentication with username/password | Must |
| FR-UM-02 | System shall enforce role-based access control (RBAC) | Must |
| FR-UM-03 | Admin can create, edit, and deactivate user accounts | Must |
| FR-UM-04 | Users cannot delete accounts, only deactivate | Must |
| FR-UM-05 | System shall log all authentication events | Should |

### 5.2 File Management (FR-FM)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-FM-01 | Önrepro can create new file records with file_no, customer info, KSM data | Must |
| FR-FM-02 | File numbers must be unique across the system | Must |
| FR-FM-03 | Files have a status that reflects current workflow state | Must |
| FR-FM-04 | Manager can assign unassigned files to a specific Grafiker | Must |
| FR-FM-05 | Once assigned, file remains owned by that Grafiker until completion | Must |
| FR-FM-06 | System tracks current department and current location slot | Must |
| FR-FM-07 | Files can be searched by file_no with instant results | Must |
| FR-FM-08 | File detail shows complete timeline, notes, and location | Must |
| FR-FM-09 | Closed files (Sent to Production) remain searchable | Must |

### 5.3 Takeover & Timer System (FR-TT)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-TT-01 | "Devral" (Takeover) is required to acknowledge physical receipt of file | Must |
| FR-TT-02 | Devral starts a timer for the current department | Must |
| FR-TT-03 | Only one active timer per file at any time (enforced) | Must |
| FR-TT-04 | Timers support multiple entries per department per file | Must |
| FR-TT-05 | Transfer action marks file as "pending takeover" by next department | Must |
| FR-TT-06 | When receiver does Devral, previous timer ends (if still active) | Must |
| FR-TT-07 | Timer durations are calculated and stored in seconds | Must |

### 5.4 Workflow & Transfers (FR-WF)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-WF-01 | Users can transfer files to the next department in workflow | Must |
| FR-WF-02 | Transfer creates an audit log entry | Must |
| FR-WF-03 | System enforces valid state transitions (see State Machine) | Must |
| FR-WF-04 | Quality NOK requires mandatory note | Must |
| FR-WF-05 | Customer NOK requires mandatory note | Must |
| FR-WF-06 | Restart MG (MG2/MG3) increments iteration and requires note | Must |
| FR-WF-07 | "Sent to Production" is terminal state; no further actions | Must |

### 5.5 Approval Loop - R100 (FR-R100)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-R100-01 | Grafiker can mark design complete and request approval | Must |
| FR-R100-02 | File goes to Önrepro for approval preparation | Must |
| FR-R100-03 | Önrepro can mark file as "Sent to Customer for Approval" | Must |
| FR-R100-04 | System tracks time in "Customer Approval" virtual department | Must |
| FR-R100-05 | Manager or Önrepro can record Customer OK | Must |
| FR-R100-06 | Customer OK proceeds to Quality (R200) | Must |
| FR-R100-07 | Customer NOK returns to same Grafiker with mandatory notes | Must |
| FR-R100-08 | Repeat files (MG2/MG3) restart from Önrepro with iteration increment | Must |

### 5.6 Quality & Production - R200 (FR-R200)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-R200-01 | Quality can mark file as OK or NOK | Must |
| FR-R200-02 | Quality NOK returns to same Grafiker with mandatory notes | Must |
| FR-R200-03 | Quality OK transfers to Kolaj | Must |
| FR-R200-04 | Kolaj can mark file as "Sent to Production" | Must |
| FR-R200-05 | "Sent to Production" closes workflow and records timestamp | Must |

### 5.7 Location Tracking (FR-LT)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LT-01 | System maintains a list of predefined location slots | Must |
| FR-LT-02 | Each file has a current location slot | Must |
| FR-LT-03 | Location is updated during transfers | Should |
| FR-LT-04 | File search displays location on a simple grid map | Must |
| FR-LT-05 | Location slots are categorized by area (Waiting, Repro, Quality, Kolaj) | Should |

### 5.8 Notes & Communication (FR-NC)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-NC-01 | Users can add notes to files | Must |
| FR-NC-02 | Notes include user, department, timestamp | Must |
| FR-NC-03 | Notes are displayed chronologically in file detail | Must |
| FR-NC-04 | Certain actions require mandatory notes (NOK, MG restart) | Must |

### 5.9 Reporting & Analytics (FR-RA)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-RA-01 | Dashboard shows daily/weekly/monthly completed file count | Must |
| FR-RA-02 | Report average processing time per department | Must |
| FR-RA-03 | Identify bottlenecks: files exceeding SLA threshold | Must |
| FR-RA-04 | Employee performance: throughput and average time (Grafiker) | Must |
| FR-RA-05 | Reports filterable by date range, department, designer, customer | Should |
| FR-RA-06 | Show workload distribution per designer | Must |
| FR-RA-07 | Alert dashboard for delayed/overdue files | Must |

### 5.10 Audit & Logging (FR-AL)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AL-01 | All state changes logged with user, timestamp, action type | Must |
| FR-AL-02 | Logs are immutable (no edit/delete) | Must |
| FR-AL-03 | Manager can view audit log with filters | Should |
| FR-AL-04 | Logs support payload for additional context | Should |

---

## 6. User Stories

### Epic: File Creation & Assignment

**US-01:** As Önrepro staff, I want to create a new file record when a physical file arrives, so that tracking begins immediately.
- Acceptance: Form with file_no, customer name, KSM data; file created in "Awaiting Assignment" status

**US-02:** As Manager, I want to see all unassigned files in a pool, so that I can distribute work fairly.
- Acceptance: Dashboard shows unassigned files sorted by creation date

**US-03:** As Manager, I want to assign a file to a specific Grafiker, so that they become responsible for it.
- Acceptance: Assignment modal with designer dropdown; file disappears from pool after assignment

### Epic: Takeover & Tracking

**US-04:** As any department user, I want to press "Devral" when I physically receive a file, so that my timer starts.
- Acceptance: Button visible only for files transferred to my department; starts timer

**US-05:** As any user, I want to search by file number and see where it is right now, so I can find physical files.
- Acceptance: Search returns file with current holder, department, location highlighted on map

**US-06:** As Manager, I want to see the complete timeline of a file, so I can understand its journey.
- Acceptance: Timeline shows all events with timestamps and durations

### Epic: Approval Workflow

**US-07:** As Grafiker, I want to mark my design complete and send for approval, so the process continues.
- Acceptance: Action button sends to Önrepro for approval prep

**US-08:** As Önrepro, I want to record customer approval outcome (OK/NOK), so the file progresses correctly.
- Acceptance: OK goes to Quality; NOK returns to Grafiker with notes

**US-09:** As Manager, I want NOK files to stay with the same Grafiker, so accountability is maintained.
- Acceptance: assigned_designer_id never changes on NOK

### Epic: Quality & Completion

**US-10:** As Quality staff, I want to approve or reject files with notes, so designs meet standards.
- Acceptance: NOK requires note; OK sends to Kolaj

**US-11:** As Kolaj staff, I want to mark files as sent to production, so the workflow completes.
- Acceptance: Terminal state; file closed; remains searchable

### Epic: Reporting

**US-12:** As Manager, I want to see bottleneck alerts, so I can address delays proactively.
- Acceptance: Dashboard shows files exceeding SLA by department

**US-13:** As Manager, I want to see designer throughput reports, so I can evaluate performance.
- Acceptance: Report shows files completed, average time, revision count per designer

---

## 7. Out of Scope (MVP)

- Digital file storage or management (Dropbox, file uploads)
- Email/SMS notifications
- Mobile native apps (responsive web only)
- Integration with external ERP/CRM systems
- Customer portal for approval
- Barcode/QR code scanning (potential Phase 2)
- Multi-language support (Turkish only for MVP)
- Advanced analytics (ML-based predictions)

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| File loss incidents | Reduce by 90% | Incident reports |
| Average time to locate file | < 30 seconds | User testing |
| Data entry compliance | > 95% Devral on time | System logs |
| Bottleneck identification | Real-time visibility | Dashboard alerts |
| User adoption | 100% of staff using daily | Login analytics |

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Staff resistance to new process | High | Medium | Training, gradual rollout |
| Incorrect Devral timing | Medium | Medium | Reminders, alerts for pending takeovers |
| System downtime | High | Low | Docker deployment, backups |
| Data entry errors | Medium | Medium | Validation, confirmation dialogs |

---

## 10. Timeline Overview

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| MVP Development | 6-8 weeks | Core workflow, RBAC, basic reporting |
| UAT & Training | 2 weeks | User testing, documentation |
| Production Deploy | 1 week | Go-live, monitoring |
| Phase 2 | 4-6 weeks | Advanced analytics, optimizations |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Devral | Turkish for "Take Over" - action to acknowledge physical receipt |
| Dosya | Turkish for "File" - the physical job folder being tracked |
| Grafiker | Graphic designer in Repro department |
| KSM | Technical specification data for the print job |
| MG1/MG2/MG3 | Iteration labels for customer revision datasets |
| Önrepro | Pre-Repro department (preparation) |
| Kalite | Quality control department |
| Kolaj | Collage/Assembly department |
| R100 | Design & Customer Approval workflow phase |
| R200 | Quality Control & Production workflow phase |
