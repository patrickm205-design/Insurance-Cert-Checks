# CertTracker - Insurance Certificate Verification for Event Venues

A SaaS application that helps event venues (wedding halls, conference centers, concert venues) automatically verify ACORD 25 Certificate of Insurance forms from vendors.

## 🎯 Project Overview

**The Problem:** Venues waste 2-5 hours per event manually checking insurance certificates from vendors (caterers, DJs, florists, etc.)

**The Solution:** A "traffic light" verification system that:
- Accepts ACORD 25 PDF uploads from vendors
- Extracts key fields using Claude Vision API
- Compares data against venue requirements
- Shows Green/Yellow/Red status to venue managers
- Sends auto-reminder emails for missing certificates
- Requires human approval (AI only flags issues)

## 📋 Current Status - Phase 1 Complete

✅ **Dashboard UI Built** (Jan 2025)
- Main dashboard with event list
- Event detail pages with vendor tables
- Traffic light status badges (green/yellow/red/gray)
- Professional B2B design using slate color palette
- Responsive layout with sidebar navigation

## 🚀 Quick Start

### View the Demo

**Option 1: Live Demo** (if repository is public)
```
https://patrickm205-design.github.io/Insurance-Cert-Checks/certtracker/demo-dashboard.html
```

**Option 2: Run Locally**
```bash
cd certtracker
npm install
npm run dev
```
Then open http://localhost:3000 in your browser.

### Development Setup

**Prerequisites:**
- Node.js 18+
- npm or yarn

**Installation:**
```bash
# Clone the repository
git clone https://github.com/patrickm205-design/Insurance-Cert-Checks.git
cd Insurance-Cert-Checks/certtracker

# Install dependencies
npm install

# Run development server
npm run dev
```

## 🏗️ Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Icons:** lucide-react
- **Future Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Future AI:** Anthropic Claude API (claude-sonnet-4)
- **Future Email:** Resend

## 📁 Project Structure

```
certtracker/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   └── events/[id]/
│   │       └── page.tsx          # Event detail page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage (redirects to dashboard)
├── components/
│   ├── certificates/
│   │   └── TrafficLightBadge.tsx # Status badge component
│   ├── dashboard/
│   │   ├── EventCard.tsx         # Event card component
│   │   └── Sidebar.tsx           # Navigation sidebar
│   └── VendorTable.tsx           # Vendor certificate table
└── demo-dashboard.html           # Standalone demo (no server needed)
```

## 🎨 Design System

**Color Palette:**
- Base: Slate/Zinc neutrals (bg-slate-50, text-slate-900)
- Primary: Indigo (bg-indigo-600 for buttons)
- Success: Emerald (bg-emerald-50 for approved status)
- Warning: Amber (bg-amber-50 for review status)
- Error: Red (bg-red-50 for issues status)
- Neutral: Gray (bg-slate-50 for not uploaded status)

**Design Principles:**
- Borders over shadows (subtle, professional look)
- Comfortable spacing (not cramped)
- Clean typography (font-semibold for headings)
- No Lorem Ipsum (realistic business data)

## 🗺️ Roadmap

### Phase 1: Dashboard UI ✅ COMPLETE
- [x] Main dashboard with event list
- [x] Event detail pages
- [x] Vendor tables with status badges
- [x] Professional design system implementation

### Phase 2: Vendor Upload Portal (Next)
- [ ] Public upload page (no login required)
- [ ] File dropzone for PDFs
- [ ] Upload confirmation emails
- [ ] File storage setup

### Phase 3: Certificate Review Page
- [ ] PDF viewer component
- [ ] Side-by-side comparison view
- [ ] Issue highlighting
- [ ] Approve/Reject workflow

### Phase 4: Claude Vision Integration
- [ ] ACORD 25 form extraction
- [ ] Field validation logic
- [ ] Confidence scoring
- [ ] Issue detection

### Phase 5: Auto-Chaser System
- [ ] Email template builder
- [ ] Scheduled reminders
- [ ] Tracking pixel integration
- [ ] Response logging

### Phase 6: Backend Integration
- [ ] Supabase setup
- [ ] Database schema
- [ ] Authentication
- [ ] File storage
- [ ] API routes

## 📊 Mock Data (Phase 1)

Currently using mock data for 4 events:
1. Johnson-Smith Wedding (Apr 15, 2025) - 6 vendors
2. TechCorp Annual Conference (May 22, 2025) - 8 vendors
3. Martinez Quinceañera (Jun 7, 2025) - 5 vendors
4. Anderson Charity Gala (Jul 18, 2025) - 10 vendors

## 🤝 Contributing

This is a private development project. For questions or collaboration:
- Contact: [Your Email]
- Repository: https://github.com/patrickm205-design/Insurance-Cert-Checks

## 📝 License

Private project - All rights reserved

## 🔗 Links

- **Live Demo:** https://patrickm205-design.github.io/Insurance-Cert-Checks/certtracker/demo-dashboard.html (once public)
- **GitHub Repository:** https://github.com/patrickm205-design/Insurance-Cert-Checks
- **Claude Session:** https://claude.ai/code/session_01KcxX4QU6dk8CLELkRxXVTg

---

**Last Updated:** February 2025
**Built with:** Claude Code by Anthropic
