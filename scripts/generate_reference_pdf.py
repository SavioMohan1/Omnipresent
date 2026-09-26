import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#00B4D8"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 755, "OMNIPRESENT")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(115, 755, "|   Autonomous Enterprise Onboarding & Orchestration Reference")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(40, 747, 572, 747)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(40, 30, "CONFIDENTIAL & PROPRIETARY  •  OMNIPRESENT ARCHITECTURE REFERENCE")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 30, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0F172A")    # Deep Slate / Navy
    c_accent = colors.HexColor("#0284C7")     # Ocean / Cyan Accent
    c_purple = colors.HexColor("#6366F1")     # Indigo
    c_dark = colors.HexColor("#1E293B")       # Body text
    c_muted = colors.HexColor("#475569")      # Secondary text
    c_bg_light = colors.HexColor("#F8FAFC")   # Table alternate
    c_card_bg = colors.HexColor("#F1F5F9")    # Card background
    c_border = colors.HexColor("#CBD5E1")     # Border
    c_success = colors.HexColor("#047857")    # Forest Green

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_purple,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_dark,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=c_dark
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=c_dark
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=c_primary
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("OMNIPRESENT", title_style))
    story.append(Paragraph("Autonomous Cross-Functional Employee Onboarding & Orchestration Platform", subtitle_style))
    story.append(Paragraph("<b>Executive Overview, Technical Architecture & System Reference Manual</b>", ParagraphStyle(
        'SubTag', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=c_muted, spaceAfter=8
    )))
    
    meta_data = [
        [
            Paragraph("<b>Target Audience:</b> Leadership, Engineering, HR & SecOps", table_cell_style),
            Paragraph("<b>System Version:</b> v1.0.0 (Production)", table_cell_style),
            Paragraph("<b>Date:</b> September 2026", table_cell_style)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[240, 150, 142])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_card_bg),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # SECTION 1
    story.append(Paragraph("1. Executive Overview & The High-Level Metaphor", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=6))
    story.append(Paragraph(
        "Modern enterprises waste hundreds of hours per hire manually coordinating IT hardware, SaaS permissions, "
        "security compliance, background checks, and manager introductions across fragmented communication channels. "
        "The fundamental root cause is that existing <b>HRIS platforms are Systems of Record, not Systems of Execution</b>.",
        body_style
    ))

    # Metaphor Box
    analogy_content = [
        [
            Paragraph(
                "<b>The Airport Control Tower & The Filing Cabinet Analogy:</b><br/>"
                "• <b>Traditional HRIS (Workday, BambooHR, Rippling):</b> The filing cabinet in the hangar. It accurately stores "
                "flight manifests, passenger names, and passport numbers, but <i>it cannot guide airplanes onto the runway</i>.<br/>"
                "• <b>Omnipresent:</b> The Air Traffic Control Tower. It continuously monitors the airspace, anticipates conflicts, "
                "orchestrates the ground crew, alerts the pilots, and ensures a seamless landing for every new hire on Day One.",
                callout_style
            )
        ]
    ]
    t_analogy = Table(analogy_content, colWidths=[532])
    t_analogy.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#93C5FD")),
        ('LINEBEFORE', (0,0), (0,-1), 4, c_accent),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_analogy)
    story.append(Spacer(1, 8))

    # SECTION 2
    story.append(Paragraph("2. How Omnipresent Acts on Top of Existing HRIS", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=6))
    story.append(Paragraph(
        "Omnipresent does <b>not</b> replace your HRIS. Instead, it operates non-invasively above it as an autonomous orchestration fabric:",
        body_style
    ))

    story.append(Paragraph("• <b>Inbound Webhook Listeners:</b> Exposes secure HTTP endpoints that receive candidate 'Hired' notifications in real time from Workday, BambooHR, Rippling, or custom webhooks.", bullet_style))
    story.append(Paragraph("• <b>Schema Normalization:</b> Translates disparate vendor-specific payloads into a unified canonical employee data model (name, role, level, department, location, clearance, tech stack).", bullet_style))
    story.append(Paragraph("• <b>SHA-256 Idempotency Engine:</b> Hashes incoming payloads to guarantee that network retries or duplicate webhook firings are acknowledged safely without duplicating work queues.", bullet_style))
    story.append(Paragraph("• <b>Cross-Departmental Dispatch:</b> Distributes work out of HR's hands into dedicated operational inboxes for IT, SecOps, Workplace Facilities, and Hiring Managers.", bullet_style))
    story.append(Paragraph("• <b>Bi-Directional Status Write-back:</b> Streams real-time progress, document verification links, and SOC2 compliance audit logs back into the central HRIS employee profile.", bullet_style))
    story.append(Spacer(1, 6))

    # Comparison Table
    comp_data = [
        [Paragraph("Feature / Capability", table_header_style), Paragraph("Existing HRIS (System of Record)", table_header_style), Paragraph("Omnipresent (System of Execution)", table_header_style)],
        [Paragraph("Core Mission", table_cell_bold), Paragraph("Store payroll, benefits, contract metadata", table_cell_style), Paragraph("Coordinate cross-functional actions & eliminate Day-1 blockers", table_cell_style)],
        [Paragraph("Onboarding Plans", table_cell_bold), Paragraph("Static, generic PDF checklist for everyone", table_cell_style), Paragraph("Role-tailored dynamic DAG with parallel dependency queues", table_cell_style)],
        [Paragraph("IT & Security", table_cell_bold), Paragraph("Blind to laptop shipping, Okta SSO, GitHub access", table_cell_style), Paragraph("Directly tracks provisioning status & blocker escalations", table_cell_style)],
        [Paragraph("Employee Support", table_cell_bold), Paragraph("Static FAQs or human HR ticketing backlog", table_cell_style), Paragraph("State-Aware Copilot + Hybrid RAG policy answers (0 tokens)", table_cell_style)],
        [Paragraph("Compliance Auditing", table_cell_bold), Paragraph("Disconnected spreadsheets and Slack threads", table_cell_style), Paragraph("Cryptographically sealed append-only audit trail (SOC2 ready)", table_cell_style)]
    ]
    t_comp = Table(comp_data, colWidths=[110, 205, 217])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 10))

    # SECTION 3
    story.append(Paragraph("3. What AI is Actually Doing in This System", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=6))
    story.append(Paragraph(
        "Rather than treating AI as a gimmicky chatbot wrapper, Omnipresent integrates AI selectively where probabilistic reasoning "
        "and contextual synthesis deliver exponential leverage over static rules:",
        body_style
    ))

    ai_data = [
        [Paragraph("AI Subsystem", table_header_style), Paragraph("Underlying Architecture", table_header_style), Paragraph("Operational Function in Omnipresent", table_header_style)],
        [
            Paragraph("1. Dynamic Plan Compiler", table_cell_bold),
            Paragraph("Azure OpenAI (gpt-5-mini) with Structured Output Schema", table_cell_style),
            Paragraph("Analyzes candidate role, clearance, seniority, and tech stack to generate a custom 15-20 task Directed Acyclic Graph (DAG) with SLA estimates and parallel queues.", table_cell_style)
        ],
        [
            Paragraph("2. Hybrid RAG Policy Engine", table_cell_bold),
            Paragraph("MiniSearch BM25 Lexical + Subword Cosine k-NN Dense Vectors", table_cell_style),
            Paragraph("Searches enterprise handbook policies (stipends, equipment, PTO, security). Returns authoritative answers with exact citations and similarity confidence scores.", table_cell_style)
        ],
        [
            Paragraph("3. State-Aware Live Copilot", table_cell_bold),
            Paragraph("Deterministic Live Graph Resolver + In-Memory Store", table_cell_style),
            Paragraph("Resolves real-time questions ('What tasks are assigned to me?', 'Who is blocking my laptop?') directly from the live database consuming <b>ZERO LLM tokens</b>.", table_cell_style)
        ],
        [
            Paragraph("4. Blocker Triage & Escalation", table_cell_bold),
            Paragraph("Contextual Root Cause Reasoner & SLA Monitor", table_cell_style),
            Paragraph("When a task is blocked (e.g. 'Okta license pool empty'), categorizes the blocker, flags the responsible department, and suggests proactive remediation.", table_cell_style)
        ]
    ]
    t_ai = Table(ai_data, colWidths=[120, 160, 252])
    t_ai.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_purple),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_ai)
    story.append(Spacer(1, 10))

    # SECTION 4
    story.append(Paragraph("4. The End-to-End Operational Workflow", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=6))
    
    wf_steps = [
        ("Step 1: Offer Signed & Inbound Ingestion", "The candidate signs their offer in Workday/BambooHR. An inbound webhook triggers Omnipresent, which normalizes the payload, calculates an idempotency hash, and registers the onboarding in DRAFT state."),
        ("Step 2: Autonomous AI Plan Compilation", "HR clicks 'Generate AI Plan'. Azure OpenAI compiles a role-tailored task DAG (e.g. 19 parallel tasks spanning IT, HR, Manager, and New Hire). Tasks include SLA hours and prerequisite dependencies."),
        ("Step 3: Human-in-the-Loop Approval & Queue Dispatch", "HR reviews the synthesized plan and clicks 'Approve & Dispatch'. The onboarding status transitions to ACTIVE, and tasks immediately route into personalized inboxes."),
        ("Step 4: Parallel Departmental Execution & Blocker Remediation", "IT provisions laptops and SSO; Managers schedule 1-on-1s; New Hires complete I-9 forms. If an item is blocked, it generates an immutable audit entry and alerts the relevant inbox."),
        ("Step 5: Automated Verification & Day-One Readiness", "Once all critical-path dependencies resolve, the system seals the onboarding as COMPLETED and syncs verification receipts back to the HRIS.")
    ]
    for step_title, step_desc in wf_steps:
        story.append(Paragraph(f"<b>{step_title}</b>", h2_style))
        story.append(Paragraph(step_desc, body_style))

    story.append(Spacer(1, 8))

    # SECTION 5
    story.append(Paragraph("5. Technical Architecture & Tech Stack Matrix", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=6))

    tech_data = [
        [Paragraph("Architecture Layer", table_header_style), Paragraph("Technology / Framework", table_header_style), Paragraph("Exact Role & Operation in System", table_header_style)],
        [Paragraph("Frontend Presentation", table_cell_bold), Paragraph("Next.js 16.3.6 (App Router) + React 19", table_cell_style), Paragraph("Executive dark mode interface, responsive glassmorphic cards, SVG orbital animations, dynamic inbox & switcher modals.", table_cell_style)],
        [Paragraph("Styling & Design System", table_cell_bold), Paragraph("Vanilla CSS + Custom CSS Variables", table_cell_style), Paragraph("Obsidian palette (#080c17), frosted glass panels (16px backdrop-filter), glowing borders, custom scrollbars.", table_cell_style)],
        [Paragraph("Backend APIs & Routing", table_cell_bold), Paragraph("Next.js Serverless Route Handlers", table_cell_style), Paragraph("Edge & Node.js REST endpoints: /api/auth/*, /api/onboarding/*, /api/copilot/*, /api/tasks/*.", table_cell_style)],
        [Paragraph("AI & Foundation Model", table_cell_bold), Paragraph("Azure OpenAI Service (gpt-5-mini)", table_cell_style), Paragraph("Generates structured JSON plan DAGs, dependency graphs, SLA estimates, and copilot policy synthesis.", table_cell_style)],
        [Paragraph("Enterprise Identity", table_cell_bold), Paragraph("@azure/identity (DefaultAzureCredential)", table_cell_style), Paragraph("Zero-secret enterprise authentication supporting Entra ID, Managed Identity, and Service Principals.", table_cell_style)],
        [Paragraph("Information Retrieval", table_cell_bold), Paragraph("Hybrid RAG (MiniSearch + Cosine k-NN)", table_cell_style), Paragraph("Reciprocal Rank Fusion combining BM25 keyword matching with dense subword vector space cosine similarities.", table_cell_style)],
        [Paragraph("State & Audit Ledger", table_cell_bold), Paragraph("Cryptographic Append-Only Ledger", table_cell_style), Paragraph("Tamper-proof ledger chaining SHA-256 hashes for all state mutations (PLAN_APPROVED, TASK_BLOCKED, etc.).", table_cell_style)],
        [Paragraph("Authentication & RBAC", table_cell_bold), Paragraph("HMAC SHA-256 Session Guard", table_cell_style), Paragraph("Multi-persona role access control supporting HR, Manager, IT, and Employee with isolated inboxes.", table_cell_style)],
        [Paragraph("Cloud Hosting & CI/CD", table_cell_bold), Paragraph("Vercel Serverless + GitHub", table_cell_style), Paragraph("Automated builds, global edge CDN distribution, zero-cold-start cloud execution.", table_cell_style)]
    ]
    t_tech = Table(tech_data, colWidths=[110, 160, 262])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 10))

    # SECTION 6
    story.append(Paragraph("6. System Credentials, Verification & Live Artifacts", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=6))

    story.append(Paragraph("<b>Production Deployment URLs:</b>", h2_style))
    story.append(Paragraph("• <b>Live Cloud Application:</b> https://onboardflow-amber.vercel.app", bullet_style))
    story.append(Paragraph("• <b>GitHub Repository:</b> https://github.com/SavioMohan1/Omnipresent", bullet_style))
    story.append(Paragraph("• <b>Local Dev Instance:</b> http://localhost:3000", bullet_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>Demo Persona Login Directory (Password for all: Omnipresent2026! or admin123):</b>", h2_style))
    cred_data = [
        [Paragraph("Role", table_header_style), Paragraph("Name", table_header_style), Paragraph("Email / Username", table_header_style), Paragraph("Operational Responsibility", table_header_style)],
        [Paragraph("HR Admin", table_cell_bold), Paragraph("Helen Reed", table_cell_style), Paragraph("helen.reed@omnipresent.ai (hr)", table_cell_style), Paragraph("Inbound candidate ingestion, plan approval, and compliance tracking", table_cell_style)],
        [Paragraph("Engineering Manager", table_cell_bold), Paragraph("Marcus Chen", table_cell_style), Paragraph("marcus.chen@omnipresent.ai (manager)", table_cell_style), Paragraph("Buddy assignment, tech stack setup, 30-60-90 day goal reviews", table_cell_style)],
        [Paragraph("IT Specialist", table_cell_bold), Paragraph("Sarah Jenkins", table_cell_style), Paragraph("sarah.jenkins@omnipresent.ai (it)", table_cell_style), Paragraph("Hardware dispatch, MDM profile enrollment, Okta SSO provisioning", table_cell_style)],
        [Paragraph("New Hire", table_cell_bold), Paragraph("Aarav Sharma", table_cell_style), Paragraph("aarav.sharma@omnipresent.ai (aarav)", table_cell_style), Paragraph("I-9 form verification, direct deposit setup, policy copilot queries", table_cell_style)]
    ]
    t_cred = Table(cred_data, colWidths=[90, 85, 160, 197])
    t_cred.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_cred)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Automated Verification: 26/26 Smoke Tests Passing (100% Pass Rate)</b>", h2_style))
    story.append(Paragraph(
        "The system has been verified through a 26-step automated test suite covering: "
        "(1) Azure Identity and OpenAI Connectivity, (2) Multi-Persona Authentication, "
        "(3) Inbound HRIS Ingestion & Idempotency, (4) AI DAG Plan Compilation, "
        "(5) State-Aware Copilot Zero-Token Resolution & Hybrid RAG Vector Search, and "
        "(6) Blocker Auditing with Tamper-Proof Cryptographic Ledgers.",
        body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == '__main__':
    output_pdf = sys.argv[1] if len(sys.argv) > 1 else "Omnipresent_Architecture_and_System_Reference.pdf"
    build_pdf(output_pdf)
