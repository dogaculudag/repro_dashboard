# MVP & Phase 2 Scope
# Repro Department File Tracking System

**Version:** 1.0  
**Date:** February 2, 2026

---

## 1. MVP Scope

### 1.1 MVP Definition
The Minimum Viable Product (MVP) includes the essential features required to track physical files through the Repro department workflow, measure time per department, and provide basic reporting. The MVP must be fully functional and production-ready.

### 1.2 MVP Features

#### ✅ Core File Management
| Feature | Description | Priority |
|---------|-------------|----------|
| File Creation | Önrepro creates file records with basic info | Must |
| File Search | Search by file number, display results | Must |
| File Detail View | Show status, owner, department, location | Must |
| File Timeline | Display chronological event history | Must |
| KSM Data Entry | Store technical data as JSON | Must |

#### ✅ Workflow & State Machine
| Feature | Description | Priority |
|---------|-------------|----------|
| Assignment | Manager assigns files to designers | Must |
| Permanent Ownership | Assigned designer owns until completion | Must |
| Takeover (Devral) | Acknowledge physical receipt of file | Must |
| Transfer | Move file to next department | Must |
| Status Tracking | Clear status at each workflow stage | Must |

#### ✅ Timer System
| Feature | Description | Priority |
|---------|-------------|----------|
| Start Timer | Timer starts on Devral | Must |
| Stop Timer | Timer stops on transfer/action | Must |
| Single Active Timer | Enforce one active timer per file | Must |
| Duration Calculation | Calculate and store elapsed time | Must |
| Multiple Entries | Support multiple timer entries per dept | Must |

#### ✅ R100 Approval Workflow
| Feature | Description | Priority |
|---------|-------------|----------|
| Request Approval | Designer sends to Önrepro | Must |
| Send to Customer | Mark as awaiting customer response | Must |
| Customer OK | Process customer approval | Must |
| Customer NOK | Return to same designer with note | Must |
| MG Restart | Increment iteration, restart workflow | Must |
| No-Approval Path | Direct to Quality option | Must |

#### ✅ R200 Quality Workflow
| Feature | Description | Priority |
|---------|-------------|----------|
| Quality OK | Approve and send to Kolaj | Must |
| Quality NOK | Reject with mandatory note | Must |
| Send to Production | Terminal action, close file | Must |

#### ✅ Location Tracking
| Feature | Description | Priority |
|---------|-------------|----------|
| Location Slots | Predefined list of physical locations | Must |
| Current Location | Track file's current slot | Must |
| Location Display | Show on simple grid map | Must |
| Update on Transfer | Update location during transfers | Should |

#### ✅ Notes System
| Feature | Description | Priority |
|---------|-------------|----------|
| Add Notes | Users can add notes to files | Must |
| View Notes | Chronological note display | Must |
| Mandatory NOK Notes | Force note on rejection actions | Must |

#### ✅ User Management
| Feature | Description | Priority |
|---------|-------------|----------|
| User Authentication | Login with username/password | Must |
| Role-Based Access | RBAC with 5 roles | Must |
| User List | Admin sees all users | Must |
| Create User | Admin creates new accounts | Must |
| Deactivate User | Admin deactivates accounts | Must |

#### ✅ Audit Logging
| Feature | Description | Priority |
|---------|-------------|----------|
| Action Logging | Log all state changes | Must |
| User Attribution | Record who performed action | Must |
| Timestamp Recording | UTC timestamps | Must |
| Payload Storage | Store relevant details | Should |

#### ✅ Basic Reporting
| Feature | Description | Priority |
|---------|-------------|----------|
| Dashboard Stats | Counts and summary metrics | Must |
| Workload Display | Files per designer | Must |
| Overdue Alerts | Files exceeding SLA | Must |
| Basic Throughput | Completed files by period | Should |

#### ✅ UI/UX
| Feature | Description | Priority |
|---------|-------------|----------|
| Login Page | Authentication interface | Must |
| Manager Dashboard | Overview and alerts | Must |
| Department Queue | My files, pending takeover | Must |
| File Detail Page | Complete file information | Must |
| Assignment Pool | Unassigned files list | Must |
| File Create Form | New file entry form | Must |
| Turkish Language | All labels in Turkish | Must |
| Responsive Design | Works on tablet/desktop | Must |

### 1.3 MVP Exclusions (Explicitly Out)
The following are NOT included in MVP:

| Feature | Reason |
|---------|--------|
| Email/SMS Notifications | Adds complexity, not critical |
| Mobile Native App | Responsive web sufficient |
| External Integrations | ERP/CRM not required initially |
| Advanced Analytics | Basic reports sufficient |
| Barcode/QR Scanning | Manual entry acceptable |
| Multi-language Support | Turkish only required |
| File Attachments | Not tracking digital files |
| Customer Portal | Internal system only |
| Real-time Updates (WebSocket) | Polling sufficient for MVP |
| Password Reset | Admin can reset manually |

### 1.4 MVP Acceptance Criteria

**Authentication & Authorization:**
- [ ] Users can log in with username/password
- [ ] Session persists for 8 hours
- [ ] Logout works correctly
- [ ] Unauthorized users redirected to login
- [ ] RBAC prevents unauthorized actions

**File Management:**
- [ ] Önrepro can create files with all required fields
- [ ] Files get unique file numbers
- [ ] Search by file number returns results in < 1 second
- [ ] File detail shows all information

**Workflow:**
- [ ] Manager sees unassigned files in pool
- [ ] Manager can assign to specific designer
- [ ] Assigned designer receives file in their queue
- [ ] Designer can take over (Devral)
- [ ] Timer starts on takeover
- [ ] Only one active timer per file
- [ ] Transfer creates pending takeover state
- [ ] Full R100 loop works (approval → customer → quality)
- [ ] Customer NOK returns to SAME designer
- [ ] MG restart increments iteration
- [ ] Full R200 loop works (quality → kolaj → production)
- [ ] Quality NOK returns to SAME designer
- [ ] Send to Production closes file

**Location:**
- [ ] Location shown on file detail
- [ ] Simple grid map displays correctly
- [ ] Current location highlighted

**Notes:**
- [ ] Notes can be added to files
- [ ] Notes display chronologically
- [ ] NOK actions require notes (validated)

**Dashboard & Reports:**
- [ ] Dashboard shows key metrics
- [ ] Overdue files highlighted
- [ ] Workload per designer visible

---

## 2. Phase 2 Scope

### 2.1 Phase 2 Definition
Phase 2 adds enhanced features, optimizations, and nice-to-haves based on MVP feedback and operational experience.

### 2.2 Phase 2 Features

#### 📊 Advanced Reporting & Analytics
| Feature | Description | Priority |
|---------|-------------|----------|
| Detailed Performance Reports | Full designer performance metrics | High |
| Department Comparison | Compare dept efficiency | High |
| Trend Analysis | Week-over-week comparisons | Medium |
| Export to Excel | Download reports as XLSX | High |
| Custom Date Ranges | Flexible filtering | High |
| SLA Compliance Report | Track against targets | High |
| Customer Analytics | Files by customer | Medium |
| Bottleneck Visualization | Visual congestion display | Medium |

#### 🔔 Notifications
| Feature | Description | Priority |
|---------|-------------|----------|
| In-App Notifications | Badge and notification center | High |
| Email Alerts | Configurable email notifications | Medium |
| Overdue Reminders | Automatic SLA warnings | High |
| Assignment Notifications | Alert when file assigned | High |
| Daily Summary Email | Optional daily digest | Low |

#### 📱 Real-Time Updates
| Feature | Description | Priority |
|---------|-------------|----------|
| WebSocket Integration | Live updates without polling | High |
| Dashboard Auto-Refresh | Real-time stats update | High |
| Queue Live Updates | Instant queue changes | Medium |

#### 🔍 Enhanced Search
| Feature | Description | Priority |
|---------|-------------|----------|
| Advanced Filters | Multi-criteria search | High |
| Search History | Recent searches | Low |
| Saved Searches | Save filter presets | Medium |
| Full-Text Search | Search in notes/KSM | Medium |

#### 📋 Bulk Operations
| Feature | Description | Priority |
|---------|-------------|----------|
| Bulk Assignment | Assign multiple files at once | High |
| Bulk Priority Update | Change priority in batch | Medium |
| Bulk Export | Export file data | Medium |

#### 🏷️ Enhanced File Management
| Feature | Description | Priority |
|---------|-------------|----------|
| File Tags | Custom tags/labels | Medium |
| File Templates | Reusable KSM templates | Low |
| File Cloning | Copy file as new | Low |
| Archive View | Better closed file browsing | Medium |

#### 🗺️ Enhanced Location Tracking
| Feature | Description | Priority |
|---------|-------------|----------|
| Visual Map Editor | Admin configures layout | Medium |
| Location History | Track movement history | Medium |
| Occupancy Dashboard | See all occupied slots | High |

#### 👤 User Management Enhancements
| Feature | Description | Priority |
|---------|-------------|----------|
| Password Reset | Self-service reset | High |
| Profile Management | Edit own details | Medium |
| Vacation Mode | Reassign on vacation | Medium |
| Team View | See team members | Low |

#### 📱 Mobile Optimization
| Feature | Description | Priority |
|---------|-------------|----------|
| PWA Support | Install as app | High |
| Offline Support | Queue actions offline | Medium |
| Touch Optimized | Better mobile UX | High |

#### 🔗 Integrations
| Feature | Description | Priority |
|---------|-------------|----------|
| SSO/LDAP | Enterprise authentication | Medium |
| ERP Integration | Sync with existing systems | Low |
| API Documentation | Public API docs | Medium |

#### 🔐 Security Enhancements
| Feature | Description | Priority |
|---------|-------------|----------|
| Two-Factor Auth | Optional 2FA | Low |
| IP Restrictions | Limit access by IP | Low |
| Session Management | View active sessions | Medium |

### 2.3 Phase 2 Timeline

```
Phase 2 Development (~6-8 weeks additional)

Week 1-2: Advanced Reporting
- Performance reports
- Export functionality
- Trend analysis

Week 3-4: Notifications & Real-Time
- WebSocket setup
- In-app notifications
- Email alerts

Week 5-6: UX Enhancements
- Mobile PWA
- Enhanced search
- Bulk operations

Week 7-8: Polish & Optional
- Location editor
- User enhancements
- Documentation
```

---

## 3. Feature Comparison Matrix

| Feature Category | MVP | Phase 2 |
|-----------------|-----|---------|
| **Authentication** | Basic login | Password reset, 2FA |
| **Files** | CRUD, search | Tags, templates, clone |
| **Workflow** | Full R100/R200 | Enhanced |
| **Timers** | Full functionality | No changes |
| **Location** | Basic grid | Visual editor |
| **Notes** | Full functionality | Rich text (optional) |
| **Reports** | Basic dashboard | Full analytics |
| **Notifications** | None | Full system |
| **Real-time** | Polling | WebSocket |
| **Mobile** | Responsive | PWA |
| **Export** | None | Excel export |
| **Integrations** | None | SSO, API docs |

---

## 4. MVP Release Checklist

### 4.1 Pre-Release
- [ ] All MVP features implemented
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] No critical/high severity bugs
- [ ] Performance targets met
- [ ] Security review completed
- [ ] Documentation complete
- [ ] Seed data script works

### 4.2 Deployment
- [ ] Docker images built and tested
- [ ] Database migrations verified
- [ ] Environment variables configured
- [ ] SSL/HTTPS configured
- [ ] Backup system in place
- [ ] Health check working
- [ ] Monitoring configured

### 4.3 Post-Release
- [ ] Smoke test in production
- [ ] User accounts created
- [ ] Initial training provided
- [ ] Support process established
- [ ] Feedback channel open

---

## 5. Success Metrics

### 5.1 MVP Success Criteria
| Metric | Target | Measurement |
|--------|--------|-------------|
| User Adoption | 100% of staff | Login count |
| File Registration | 100% of new files | Manual audit |
| Devral Compliance | >90% timely | System logs |
| Search Time | <30 seconds | User feedback |
| System Uptime | >99% | Monitoring |
| Bug Reports | <10 critical/month | Issue tracker |

### 5.2 Phase 2 Success Criteria
| Metric | Target | Measurement |
|--------|--------|-------------|
| Report Usage | 3x/week by manager | Analytics |
| Notification CTR | >50% | Click tracking |
| Mobile Usage | >20% of sessions | Analytics |
| Export Usage | >10 exports/month | Logs |
| User Satisfaction | >4.0/5.0 | Survey |

---

## 6. Risk Assessment by Phase

### 6.1 MVP Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Timer race conditions | High | Medium | DB transactions |
| User resistance | Medium | Medium | Training |
| Incomplete requirements | Medium | Low | Assumptions documented |
| Performance issues | Medium | Low | Indexing, caching |

### 6.2 Phase 2 Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| WebSocket complexity | Medium | Medium | Fallback to polling |
| Email delivery issues | Low | Medium | Use reliable service |
| Mobile PWA limitations | Low | Low | Progressive enhancement |
| Scope creep | Medium | High | Strict prioritization |

---

## 7. Decision Log

### 7.1 MVP Decisions

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| D1 | Use Next.js App Router | Modern, full-stack solution | 2026-02-02 |
| D2 | PostgreSQL for database | JSONB support, mature | 2026-02-02 |
| D3 | JWT sessions over database | Simpler, stateless | 2026-02-02 |
| D4 | Polling over WebSocket | Simpler for MVP | 2026-02-02 |
| D5 | Customer OK → Quality | Streamlines workflow | 2026-02-02 |
| D6 | Timer stops on transfer | Clear handoff point | 2026-02-02 |
| D7 | Turkish only for MVP | Primary user base | 2026-02-02 |
| D8 | Grid-based location map | Sufficient for needs | 2026-02-02 |

### 7.2 Deferred Decisions

| # | Topic | Options | Decide By |
|---|-------|---------|-----------|
| DD1 | Email service provider | SendGrid vs SES vs SMTP | Phase 2 start |
| DD2 | Analytics tool | Custom vs Metabase | Phase 2 |
| DD3 | Mobile app approach | PWA vs Native | Phase 2 |
| DD4 | SSO provider | Azure AD vs Okta | Phase 2 if needed |

---

## 8. Glossary

| Term | Definition |
|------|------------|
| MVP | Minimum Viable Product - smallest feature set for production use |
| R100 | Design and Customer Approval workflow phase |
| R200 | Quality Control and Production workflow phase |
| Devral | Turkish for "Take Over" - physical receipt acknowledgment |
| MG1/MG2/MG3 | Iteration labels for customer data revisions |
| SLA | Service Level Agreement - time targets per department |
| PWA | Progressive Web App - installable web application |
| RBAC | Role-Based Access Control |
