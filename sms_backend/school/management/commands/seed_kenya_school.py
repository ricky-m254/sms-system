"""
seed_kenya_school.py
Comprehensive sample data for a Kenyan 8-4-4 high school (St. Mary's Nairobi High School).
Includes: academic structure, 40 students, 12 teachers, fee structures, payments,
admissions applications, HR leave requests, library acquisitions, maintenance requests,
communication data, and more — designed to populate all approval workflows.
Usage: python manage.py seed_kenya_school [--schema_name demo_school]
"""
from datetime import date, timedelta
from decimal import Decimal
import random
import uuid

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.utils import schema_context

from clients.models import Tenant, Domain
from school.models import (
    Role, UserProfile, Student, Guardian, Enrollment, SchoolClass,
    FeeStructure, Invoice, InvoiceLineItem, Payment, PaymentAllocation,
    Expense, AdmissionApplication, AcademicYear, Term,
    Department, Subject,
    GradingScheme, GradeBand,
    Assessment, AssessmentGrade, TermResult, ReportCard,
)
from hr.models import Staff
from communication.models import Message

User = get_user_model()

KENYAN_MALE_NAMES = [
    ("Peter", "Kamau"), ("John", "Mwangi"), ("David", "Njoroge"),
    ("Michael", "Ochieng"), ("James", "Wafula"), ("Samuel", "Kiprotich"),
    ("Daniel", "Otieno"), ("Francis", "Mutua"), ("Patrick", "Njiru"),
    ("George", "Abuya"), ("Emmanuel", "Kariuki"), ("Brian", "Ndegwa"),
    ("Kevin", "Waweru"), ("Collins", "Omondi"), ("Victor", "Cheruiyot"),
    ("Joseph", "Kimani"), ("Eric", "Ndirangu"), ("Mark", "Kipchoge"),
    ("Andrew", "Mugo"), ("Timothy", "Simiyu"),
]

KENYAN_FEMALE_NAMES = [
    ("Mary", "Wanjiku"), ("Grace", "Murugi"), ("Faith", "Achieng"),
    ("Joyce", "Wangari"), ("Esther", "Chepkoech"), ("Ruth", "Adhiambo"),
    ("Alice", "Nyambura"), ("Susan", "Auma"), ("Caroline", "Kiptoo"),
    ("Janet", "Waweru"), ("Beatrice", "Njeri"), ("Priscilla", "Chebet"),
    ("Mercy", "Atieno"), ("Winnie", "Njoki"), ("Lydia", "Chemutai"),
    ("Tabitha", "Mwende"), ("Naomi", "Awuor"), ("Deborah", "Jeptoo"),
    ("Rachel", "Wairimu"), ("Eunice", "Kerubo"),
]

TEACHER_DATA = [
    ("Samuel", "Otieno", "Mathematics", "0722100001"),
    ("Grace", "Wanjiku", "English", "0722100002"),
    ("David", "Mwangi", "Biology", "0722100003"),
    ("Faith", "Njoroge", "Chemistry", "0722100004"),
    ("Peter", "Kamau", "Physics", "0722100005"),
    ("Mary", "Achieng", "History & Government", "0722100006"),
    ("John", "Mutua", "Geography", "0722100007"),
    ("Susan", "Wafula", "Business Studies", "0722100008"),
    ("James", "Simiyu", "Kiswahili", "0722100009"),
    ("Esther", "Kimani", "CRE", "0722100010"),
    ("George", "Ndegwa", "Agriculture", "0722100011"),
    ("Alice", "Chebet", "Computer Studies", "0722100012"),
]

NON_TEACHING_STAFF_DATA = [
    # (first, last, role, phone)
    ("Joseph", "Karanja",   "Principal",              "0711200001"),
    ("Agnes",  "Wanjiku",   "Deputy Principal",       "0711200002"),
    ("David",  "Murithi",   "Senior Clerk",           "0711200003"),
    ("Rose",   "Atieno",    "Bursar",                 "0711200004"),
    ("Charles","Mutuku",    "Accounts Assistant",     "0711200005"),
    ("Pauline","Njoroge",   "School Secretary",       "0711200006"),
    ("Moses",  "Ochieng",   "Lab Technician",         "0711200007"),
    ("Jane",   "Wafula",    "Librarian",              "0711200008"),
    ("Simon",  "Kipkoech",  "Driver",                 "0711200009"),
    ("Peter",  "Njiru",     "Driver",                 "0711200010"),
    ("Francis","Onyango",   "Security Guard",         "0711200011"),
    ("Mary",   "Auma",      "Security Guard",         "0711200012"),
    ("John",   "Chepkwony","Head Cook",               "0711200013"),
    ("Grace",  "Adhiambo",  "Kitchen Staff",          "0711200014"),
    ("Samuel", "Ndirangu",  "Groundskeeper",          "0711200015"),
    ("Elizabeth","Mwenda",  "Nurse",                  "0711200016"),
    ("James",  "Kiptoo",    "ICT Technician",         "0711200017"),
    ("Naomi",  "Chebet",    "Matron",                 "0711200018"),
]

SUBJECTS_844 = [
    "Mathematics", "English", "Kiswahili",
    "Biology", "Chemistry", "Physics",
    "History & Government", "Geography", "CRE",
    "Business Studies", "Agriculture", "Computer Studies",
]

FORMS = ["Form 1", "Form 2", "Form 3", "Form 4"]
STREAMS = ["East", "West", "North", "South"]

FEE_ITEMS = [
    ("Tuition Fee", Decimal("12000.00")),
    ("Boarding Fee", Decimal("15000.00")),
    ("Activity Fee", Decimal("2500.00")),
    ("Lunch Fee", Decimal("3500.00")),
    ("ICT Levy", Decimal("1500.00")),
    ("Games & Sports", Decimal("1000.00")),
    ("Caution Money", Decimal("500.00")),
]

MAINTENANCE_ITEMS = [
    ("Science Lab Equipment Repair", "High", "Laboratory Block"),
    ("Library Roof Leak", "Urgent", "Library Building"),
    ("Computer Lab Projector Fault", "Medium", "Computer Lab"),
    ("Sports Ground Fencing", "Low", "Sports Ground"),
    ("Classroom 12B Door Replacement", "Medium", "Form 2 Block"),
    ("Kitchen Exhaust Fan Repair", "High", "Kitchen"),
    ("Dormitory Bunk Beds Repair", "Medium", "Boarding House"),
    ("School Bus Service", "High", "Garage"),
]


class Command(BaseCommand):
    help = "Seeds comprehensive Kenyan high school demo data (St. Mary's Nairobi High School)."

    def add_arguments(self, parser):
        parser.add_argument("--schema_name", type=str, default="demo_school")

    def handle(self, *args, **options):
        schema_name = options["schema_name"]

        with schema_context("public"):
            tenant, _ = Tenant.objects.get_or_create(
                schema_name=schema_name,
                defaults={
                    "name": "St. Mary's Nairobi High School",
                    "paid_until": date(2030, 1, 1),
                    "is_active": True,
                },
            )
            Domain.objects.get_or_create(
                domain="demo.localhost",
                tenant=tenant,
                defaults={"is_primary": True},
            )

        with schema_context(schema_name):
            self._seed_all(schema_name)

        self.stdout.write(self.style.SUCCESS(
            f"Kenyan school data seeded successfully for schema '{schema_name}'."
        ))

    def _seed_all(self, schema_name):
        self.stdout.write("  Seeding roles and modules…")
        self._seed_roles_modules()

        self.stdout.write("  Seeding admin user…")
        admin = self._seed_admin_user()

        self.stdout.write("  Seeding academic structure…")
        year, terms, classes = self._seed_academics()

        self.stdout.write("  Seeding staff / teachers…")
        self._seed_staff(admin)

        self.stdout.write("  Seeding students (40)…")
        students = self._seed_students(classes, terms)

        self.stdout.write("  Seeding fee structures and invoices…")
        self._seed_fees(year, terms, students)

        self.stdout.write("  Seeding admission applications…")
        self._seed_admissions(year, terms)

        self.stdout.write("  Seeding maintenance requests…")
        self._seed_maintenance(admin)

        self.stdout.write("  Seeding communication messages…")
        self._seed_communication(students, admin)

        self.stdout.write("  Seeding Kenyan CBC curriculum…")
        self._seed_curriculum()

        self.stdout.write("  Seeding gradebook (assessments + marks + term results + report cards)…")
        self._seed_gradebook_and_reports(year, terms, classes)

    # ── Gradebook + Report Cards ──────────────────────────────────────────────
    def _seed_gradebook_and_reports(self, year, terms, classes):
        import random
        random.seed(42)

        # 1. KNEC Grading Scheme
        scheme, _ = GradingScheme.objects.get_or_create(
            name="KNEC Standard",
            defaults={"is_default": True, "is_active": True},
        )
        KNEC_BANDS = [
            ("A",  75, 100, 12.0, "Excellent"),
            ("A-", 70,  74, 11.0, "Very Good"),
            ("B+", 65,  69, 10.0, "Good"),
            ("B",  60,  64,  9.0, "Good"),
            ("B-", 55,  59,  8.0, "Above Average"),
            ("C+", 50,  54,  7.0, "Average"),
            ("C",  45,  49,  6.0, "Average"),
            ("C-", 40,  44,  5.0, "Below Average"),
            ("D+", 35,  39,  4.0, "Below Average"),
            ("D",  30,  34,  3.0, "Poor"),
            ("D-", 25,  29,  2.0, "Very Poor"),
            ("E",   0,  24,  1.0, "Fail"),
        ]
        bands = {}
        for label, mn, mx, pts, rem in KNEC_BANDS:
            b, _ = GradeBand.objects.get_or_create(
                scheme=scheme, label=label,
                defaults={"min_score": mn, "max_score": mx, "grade_point": pts, "remark": rem, "is_active": True},
            )
            bands[label] = b

        def score_to_band(score):
            for label, mn, mx, _, _ in KNEC_BANDS:
                if mn <= score <= mx:
                    return bands.get(label)
            return None

        # 2. Core subjects to assess
        CORE_CODES = ["MTH", "ENG", "KSW", "BIO", "CHE", "PHY", "HIS", "GEO"]
        core_subjects = list(Subject.objects.filter(code__in=CORE_CODES, is_active=True))
        if not core_subjects:
            core_subjects = list(Subject.objects.filter(is_active=True)[:6])

        term1 = terms[0]
        admin_user = User.objects.filter(is_superuser=True).first()

        # Assessment definitions per term
        ASSESSMENTS = [
            ("CAT 1",    "Test", "2025-02-07",  30, 30.0),
            ("Mid-Term", "Exam", "2025-02-28", 100, 40.0),
            ("CAT 2",    "Test", "2025-03-14",  30, 30.0),
        ]

        total_cards = 0
        total_grades = 0

        # Seed all active classes that have enrolled students
        target_classes = list(SchoolClass.objects.filter(is_active=True))

        for cls in target_classes:
            # Get enrolled students for this class
            enrolled = list(
                Enrollment.objects.filter(
                    school_class=cls, is_active=True
                ).select_related("student")
            )
            students_in_class = [e.student for e in enrolled]
            if not students_in_class:
                continue

            for subject in core_subjects[:6]:
                subject_term_scores = {}  # student_id -> weighted total

                for aname, acat, adate, amax, aweight in ASSESSMENTS:
                    # Generate plausible marks (normal-ish distribution, centre ~58/100)
                    # Scale marks to amax
                    asmnt, _ = Assessment.objects.get_or_create(
                        name=f"{aname} – {subject.code} – {cls.display_name}",
                        defaults={
                            "category": acat,
                            "subject": subject,
                            "class_section": cls,
                            "term": term1,
                            "max_score": amax,
                            "weight_percent": aweight,
                            "date": adate,
                            "is_published": True,
                            "is_active": True,
                        },
                    )

                    for student in students_in_class:
                        # Realistic Kenyan distribution: peak around 55-65%
                        base = random.gauss(58, 15)  # mean 58%, sd 15
                        base = max(5, min(98, base))  # clamp
                        raw = round(base / 100 * amax, 1)
                        pct = round(raw / amax * 100, 2)
                        band = score_to_band(pct)

                        AssessmentGrade.objects.get_or_create(
                            assessment=asmnt,
                            student=student,
                            defaults={
                                "raw_score": raw,
                                "percentage": pct,
                                "grade_band": band,
                                "entered_by": admin_user,
                                "is_active": True,
                            },
                        )
                        total_grades += 1

                        # Accumulate weighted score toward term result
                        contrib = (raw / amax) * 100 * (aweight / 100)
                        subject_term_scores[student.id] = subject_term_scores.get(student.id, 0) + contrib

                # Build TermResults for this subject
                scores = [(sid, sc) for sid, sc in subject_term_scores.items()]
                scores.sort(key=lambda x: -x[1])
                for rank, (sid, total) in enumerate(scores, 1):
                    total_rounded = round(total, 2)
                    band = score_to_band(total_rounded)
                    TermResult.objects.update_or_create(
                        student_id=sid,
                        class_section=cls,
                        term=term1,
                        subject=subject,
                        defaults={
                            "total_score": total_rounded,
                            "grade_band": band,
                            "class_rank": rank,
                            "is_pass": total_rounded >= 40.0,
                            "is_active": True,
                        },
                    )

            # Generate Report Cards (one per student per class per term)
            for student in students_in_class:
                # calculate mean score across subjects for overall grade
                results = TermResult.objects.filter(
                    student=student, class_section=cls, term=term1, is_active=True
                )
                if results.exists():
                    avg = sum(float(r.total_score) for r in results) / results.count()
                    band = score_to_band(round(avg, 2))
                    grade_label = band.label if band else "C"
                else:
                    avg = 55.0
                    grade_label = "C+"

                # rank among class
                class_rank = None
                ranked = list(
                    TermResult.objects.filter(
                        class_section=cls, term=term1, subject=core_subjects[0], is_active=True
                    ).order_by("class_rank")
                )
                for i, tr in enumerate(ranked, 1):
                    if tr.student_id == student.id:
                        class_rank = i
                        break

                REMARKS = [
                    "Excellent performance! Keep it up.",
                    "Very good effort. Aim higher next term.",
                    "Satisfactory performance. More effort needed.",
                    "Needs to improve concentration in class.",
                    "Good improvement shown this term.",
                ]
                PRINCIPAL = [
                    "A diligent student. Continue with the same spirit.",
                    "Good performance. We expect even better results.",
                    "Consistent effort. Keep working hard.",
                ]
                rc, _ = ReportCard.objects.get_or_create(
                    student=student,
                    class_section=cls,
                    term=term1,
                    academic_year=year,
                    defaults={
                        "status": "Approved",
                        "overall_grade": grade_label,
                        "class_rank": class_rank,
                        "attendance_days": random.randint(58, 65),
                        "teacher_remarks": random.choice(REMARKS),
                        "principal_remarks": random.choice(PRINCIPAL),
                        "approved_by": admin_user,
                        "approved_at": timezone.now(),
                        "is_active": True,
                    },
                )
                total_cards += 1

        self.stdout.write(
            f"    → Grades entered: {total_grades}, Report cards: {total_cards}"
        )

    # ── Kenyan CBC Curriculum ─────────────────────────────────────────────────
    def _seed_curriculum(self):
        # Departments
        DEPT_DATA = [
            ("Sciences", "Biology, Chemistry, Physics, Agriculture"),
            ("Mathematics", "Mathematics, Additional Mathematics"),
            ("Languages", "English, Kiswahili, French, German"),
            ("Humanities", "History & Government, Geography, CRE, IRE, HRE"),
            ("Technical", "Computer Studies, Home Science, Art & Design"),
            ("Business", "Business Studies, Economics, Accounting"),
            ("Creative Arts", "Music, Drama, Art"),
            ("Physical Education", "Physical Education & Sports"),
        ]
        depts = {}
        for name, desc in DEPT_DATA:
            d, _ = Department.objects.get_or_create(
                name=name, defaults={"description": desc, "is_active": True}
            )
            depts[name] = d

        # Kenyan 8-4-4 and CBC Senior Secondary subjects
        SUBJECT_DATA = [
            # (name, code, dept_key, subject_type, periods_week)
            ("Mathematics",              "MTH", "Mathematics",  "Compulsory", 8),
            ("English",                  "ENG", "Languages",    "Compulsory", 8),
            ("Kiswahili",                "KSW", "Languages",    "Compulsory", 5),
            ("Biology",                  "BIO", "Sciences",     "Compulsory", 4),
            ("Chemistry",                "CHE", "Sciences",     "Compulsory", 4),
            ("Physics",                  "PHY", "Sciences",     "Compulsory", 4),
            ("History & Government",     "HIS", "Humanities",   "Elective",   4),
            ("Geography",                "GEO", "Humanities",   "Elective",   4),
            ("Christian Religious Ed.",  "CRE", "Humanities",   "Elective",   4),
            ("Business Studies",         "BST", "Business",     "Elective",   4),
            ("Agriculture",              "AGR", "Sciences",     "Elective",   4),
            ("Computer Studies",         "CMP", "Technical",    "Elective",   4),
            ("Home Science",             "HMS", "Technical",    "Elective",   4),
            ("Art & Design",             "ART", "Creative Arts","Elective",   3),
            ("Music",                    "MUS", "Creative Arts","Elective",   3),
            ("Physical Education",       "PE",  "Physical Education", "Compulsory", 3),
            # CBC strands
            ("Integrated Science",       "ISC", "Sciences",     "Compulsory", 5),
            ("Social Studies",           "SST", "Humanities",   "Compulsory", 5),
            ("Creative Arts & Sports",   "CAS", "Creative Arts","Compulsory", 4),
            ("Pre-Technical Studies",    "PTS", "Technical",    "Compulsory", 4),
            ("Life Skills Education",    "LSE", "Humanities",   "Compulsory", 2),
            ("Religious Education",      "RE",  "Humanities",   "Elective",   2),
        ]
        for name, code, dept_key, s_type, periods in SUBJECT_DATA:
            dept = depts.get(dept_key)
            Subject.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "department": dept,
                    "subject_type": s_type,
                    "periods_week": periods,
                    "is_active": True,
                },
            )

    # ── Roles & Modules ─────────────────────────────────────────────────────
    def _seed_roles_modules(self):
        roles = [
            ("TENANT_SUPER_ADMIN", "School Principal"),
            ("ADMIN", "Deputy Principal / Administrator"),
            ("ACCOUNTANT", "School Bursar"),
            ("TEACHER", "Teaching Staff"),
            ("LIBRARIAN", "School Librarian"),
            ("NURSE", "School Nurse"),
        ]
        for name, desc in roles:
            Role.objects.get_or_create(name=name, defaults={"description": desc})

        try:
            from school.models import Module
            modules = [
                ("CORE", "Core Administration"), ("STUDENTS", "Students"),
                ("ADMISSIONS", "Admissions"), ("FINANCE", "Finance"),
                ("ACADEMICS", "Academics"), ("HR", "Human Resources"),
                ("STAFF", "Staff Management"), ("PARENTS", "Parent Portal"),
                ("LIBRARY", "Library Management"), ("ASSETS", "Assets"),
                ("COMMUNICATION", "Communication"), ("REPORTING", "Reporting"),
                ("STORE", "Store & Inventory"), ("DISPENSARY", "Dispensary"),
                ("TIMETABLE", "School Timetable"), ("TRANSPORT", "Transport"),
                ("EXAMINATIONS", "Examinations"), ("HOSTEL", "Hostel"),
                ("MAINTENANCE", "Maintenance"), ("CURRICULUM", "Curriculum"),
                ("ELEARNING", "E-Learning"), ("ANALYTICS", "Analytics"),
                ("CLOCKIN", "Clock-In"),
            ]
            for key, name in modules:
                Module.objects.get_or_create(key=key, defaults={"name": name})
        except ImportError:
            pass

    # ── Admin User ───────────────────────────────────────────────────────────
    def _seed_admin_user(self):
        user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@stmarysnairobi.ac.ke",
                "first_name": "Principal",
                "last_name": "Mwangi",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if not user.check_password("admin123"):
            user.set_password("admin123")
            user.save()
        role = Role.objects.get(name="TENANT_SUPER_ADMIN")
        UserProfile.objects.get_or_create(user=user, defaults={"role": role})
        return user

    # ── Academic Structure ────────────────────────────────────────────────────
    def _seed_academics(self):
        year, _ = AcademicYear.objects.get_or_create(
            name="2025",
            defaults={
                "start_date": date(2025, 1, 6),
                "end_date": date(2025, 11, 28),
                "is_active": True,
            },
        )

        term_defs = [
            ("Term 1 2025", date(2025, 1, 6), date(2025, 4, 4)),
            ("Term 2 2025", date(2025, 4, 28), date(2025, 8, 1)),
            ("Term 3 2025", date(2025, 8, 25), date(2025, 11, 28)),
        ]
        terms = []
        for i, (name, start, end) in enumerate(term_defs):
            t, _ = Term.objects.get_or_create(
                academic_year=year,
                name=name,
                defaults={"start_date": start, "end_date": end, "is_active": i == 0},
            )
            terms.append(t)

        classes = {}
        for form in FORMS:
            classes[form] = {}
            for stream in STREAMS:
                cls, _ = SchoolClass.objects.get_or_create(
                    name=form,
                    stream=stream,
                    academic_year=year,
                    defaults={"is_active": True},
                )
                classes[form][stream] = cls

        return year, terms, classes

    # ── Staff ────────────────────────────────────────────────────────────────
    def _seed_staff(self, admin_user):
        teacher_role = Role.objects.filter(name="TEACHER").first()
        for i, (first, last, subject, phone) in enumerate(TEACHER_DATA):
            emp_id = f"TCH{str(i + 1).zfill(3)}"
            Staff.objects.get_or_create(
                employee_id=emp_id,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "role": "Teacher",
                    "phone": phone,
                },
            )
            username = f"{first.lower()}.{last.lower()}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "email": f"{username}@stmarysnairobi.ac.ke",
                },
            )
            if created:
                user.set_password("teacher123")
                user.save()
            if teacher_role:
                UserProfile.objects.get_or_create(user=user, defaults={"role": teacher_role})

        # Non-teaching staff
        for i, (first, last, role, phone) in enumerate(NON_TEACHING_STAFF_DATA):
            emp_id = f"NTS{str(i + 1).zfill(3)}"
            Staff.objects.get_or_create(
                employee_id=emp_id,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "phone": phone,
                },
            )

        # Seed HR leave requests for approval
        try:
            from hr.models import LeaveRequest, LeaveType
            lt, _ = LeaveType.objects.get_or_create(
                name="Annual Leave",
                defaults={"max_days_year": 21, "is_paid": True},
            )
            leave_data = [
                ("samuel.otieno", date(2025, 3, 10), date(2025, 3, 14), "Personal matter"),
                ("grace.wanjiku", date(2025, 3, 17), date(2025, 3, 19), "Medical appointment"),
                ("david.mwangi", date(2025, 4, 7), date(2025, 4, 11), "Family event"),
                ("faith.njoroge", date(2025, 2, 24), date(2025, 2, 28), "Rest leave"),
            ]
            for username, start, end, reason in leave_data:
                user = User.objects.filter(username=username).first()
                if user:
                    staff = Staff.objects.filter(
                        first_name=user.first_name, last_name=user.last_name
                    ).first()
                    if staff:
                        LeaveRequest.objects.get_or_create(
                            employee=staff,
                            start_date=start,
                            defaults={
                                "end_date": end,
                                "leave_type": lt,
                                "reason": reason,
                                "status": "Pending",
                            },
                        )
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"    Leave requests skipped: {e}"))

    # ── Students ─────────────────────────────────────────────────────────────
    def _seed_students(self, classes, terms):
        students = []
        all_names = (
            [(f, l, "M") for f, l in KENYAN_MALE_NAMES] +
            [(f, l, "F") for f, l in KENYAN_FEMALE_NAMES]
        )
        form_stream_pairs = [
            (f, s) for f in FORMS for s in STREAMS
        ]

        for i, (first, last, gender) in enumerate(all_names):
            adm_no = f"STM{2025}{str(i + 1).zfill(3)}"
            form, stream = form_stream_pairs[i % len(form_stream_pairs)]
            dob_year = 2025 - (14 + int(form[-1]))
            s, _ = Student.objects.get_or_create(
                admission_number=adm_no,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "gender": gender,
                    "date_of_birth": date(dob_year, random.randint(1, 12), random.randint(1, 28)),
                },
            )
            # Guardian
            g_name = f"Mr./Mrs. {last}"
            Guardian.objects.get_or_create(
                student=s,
                name=g_name,
                defaults={
                    "relationship": "Parent",
                    "phone": f"07{random.randint(10000000, 99999999)}",
                    "email": f"parent.{last.lower()}@gmail.com",
                },
            )
            # Enroll in Term 1
            cls = classes[form][stream]
            Enrollment.objects.get_or_create(
                student=s,
                school_class=cls,
                term=terms[0],
            )
            students.append(s)

        return students

    # ── Fees & Invoices ───────────────────────────────────────────────────────
    def _seed_fees(self, year, terms, students):
        # Create fee structures per term
        fee_structs = {}
        for term in terms:
            structs = []
            for name, amount in FEE_ITEMS:
                fs, _ = FeeStructure.objects.get_or_create(
                    name=f"{name} — {term.name}",
                    academic_year=year,
                    term=term,
                    defaults={"amount": amount, "is_active": True},
                )
                structs.append(fs)
            fee_structs[term.id] = structs

        term1 = terms[0]
        structs = fee_structs[term1.id]
        total_term1 = sum(fs.amount for fs in structs)

        # Invoice + payment for each student
        ref_counter = 9000
        for i, student in enumerate(students):
            inv = Invoice.objects.create(
                student=student,
                term=term1,
                due_date=date(2025, 2, 14),
                total_amount=total_term1,
                status="CONFIRMED",
            )
            for fs in structs:
                InvoiceLineItem.objects.create(
                    invoice=inv,
                    fee_structure=fs,
                    description=fs.name.split(" — ")[0],
                    amount=fs.amount,
                )

            # Varying payment amounts: some full, some partial, some none
            if i % 3 == 0:
                paid_amount = total_term1  # Fully paid
            elif i % 3 == 1:
                paid_amount = total_term1 * Decimal("0.5")  # Half paid
            else:
                paid_amount = Decimal("0")  # Unpaid

            if paid_amount > 0:
                ref_counter += 1
                unique_ref = f"RCPT-KE{ref_counter}-{uuid.uuid4().hex[:6].upper()}"
                pmt, _ = Payment.objects.get_or_create(
                    student=student,
                    notes=f"Term 1 2025 payment — {student.admission_number}",
                    defaults={
                        "amount": paid_amount,
                        "payment_method": random.choice(["Cash", "M-Pesa", "Bank Transfer", "Cheque"]),
                        "reference_number": unique_ref,
                    },
                )
                PaymentAllocation.objects.create(
                    payment=pmt,
                    invoice=inv,
                    amount_allocated=paid_amount,
                )

        # School expenses
        expenses = [
            ("Utilities", Decimal("45000.00"), "Electricity bill — January 2025"),
            ("Utilities", Decimal("12000.00"), "Water bill — January 2025"),
            ("Salaries", Decimal("780000.00"), "Teaching staff payroll — January 2025"),
            ("Supplies", Decimal("28500.00"), "Stationery and exercise books"),
            ("Maintenance", Decimal("35000.00"), "Lab equipment servicing"),
            ("Transport", Decimal("15000.00"), "Bus fuel — January 2025"),
            ("Catering", Decimal("120000.00"), "Food supplies — Term 1"),
            ("Security", Decimal("18000.00"), "Security services — January"),
        ]
        for cat, amt, desc in expenses:
            Expense.objects.create(
                category=cat, amount=amt,
                expense_date=date(2025, 1, random.randint(5, 28)),
                description=desc,
            )

    # ── Admission Applications ────────────────────────────────────────────────
    def _seed_admissions(self, year, terms):
        candidates = [
            ("Amina", "Hassan", "F", date(2012, 3, 15)),
            ("Caleb", "Kiptanui", "M", date(2012, 7, 22)),
            ("Zipporah", "Muthoni", "F", date(2012, 1, 10)),
            ("Elvis", "Odhiambo", "M", date(2012, 11, 5)),
            ("Vivian", "Chepkemoi", "F", date(2012, 4, 18)),
            ("Arnold", "Gacheru", "M", date(2012, 9, 30)),
            ("Gladys", "Onyango", "F", date(2012, 6, 8)),
            ("Clifford", "Njuguna", "M", date(2012, 2, 14)),
        ]
        statuses = ["Submitted", "Submitted", "Submitted", "Documents Received",
                    "Interview Scheduled", "Assessed", "Submitted", "Documents Received"]

        for i, ((first, last, gender, dob), status) in enumerate(zip(candidates, statuses)):
            num = f"APP2025{str(i + 1).zfill(3)}"
            AdmissionApplication.objects.get_or_create(
                application_number=num,
                defaults={
                    "student_first_name": first,
                    "student_last_name": last,
                    "student_gender": gender,
                    "student_dob": dob,
                    "application_date": date(2024, 11, random.randint(1, 28)),
                    "guardian_name": f"Parent of {first} {last}",
                    "guardian_phone": f"07{random.randint(10000000, 99999999)}",
                    "guardian_email": f"parent.{last.lower()}@gmail.com",
                    "notes": "Applying for Form 1 admission, 2025 academic year.",
                },
            )

    # ── Maintenance Requests ──────────────────────────────────────────────────
    def _seed_maintenance(self, admin_user):
        try:
            from maintenance.models import MaintenanceCategory, MaintenanceRequest

            cat_names = ["Electrical", "Civil Works", "Plumbing", "ICT Equipment", "Furniture"]
            cats = {}
            for name in cat_names:
                c, _ = MaintenanceCategory.objects.get_or_create(name=name)
                cats[name] = c

            category_map = {
                "Science Lab Equipment Repair": cats["ICT Equipment"],
                "Library Roof Leak": cats["Civil Works"],
                "Computer Lab Projector Fault": cats["ICT Equipment"],
                "Sports Ground Fencing": cats["Civil Works"],
                "Classroom 12B Door Replacement": cats["Civil Works"],
                "Kitchen Exhaust Fan Repair": cats["Electrical"],
                "Dormitory Bunk Beds Repair": cats["Furniture"],
                "School Bus Service": cats["Civil Works"],
            }

            for title, priority, location in MAINTENANCE_ITEMS:
                MaintenanceRequest.objects.get_or_create(
                    title=title,
                    defaults={
                        "description": f"{title} — requires urgent attention at {location}.",
                        "category": category_map.get(title, cats["Civil Works"]),
                        "priority": priority,
                        "status": "Pending",
                        "location": location,
                        "reported_by": admin_user,
                        "cost_estimate": Decimal(str(random.randint(5000, 80000))),
                    },
                )
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"    Maintenance requests skipped: {e}"))

    # ── Communication ─────────────────────────────────────────────────────────
    def _seed_communication(self, students, admin_user):
        announcements_data = [
            ("Term 1 2025 Opening Day", "School will open on Monday 6th January 2025. All students should report by 8:00 AM."),
            ("KCSE Mock Examinations Schedule", "Form 4 mock exams begin on 10th February 2025. Timetables available from the Deputy Principal's office."),
            ("Parents' Meeting — Term 1", "All parents are invited to the annual parents' meeting on 15th February 2025 at 9:00 AM."),
            ("Fee Payment Deadline", "All Term 1 fees must be paid by 14th February 2025. Contact the bursar for payment plans."),
            ("Kenya Science Congress Registration", "Students interested in the Kenya Science Congress should submit proposals to the Head of Science by 20th January."),
        ]
        try:
            from communication.models import Announcement
            for title, body in announcements_data:
                Announcement.objects.get_or_create(
                    title=title,
                    defaults={
                        "body": body,
                        "priority": "Important",
                        "audience_type": "All",
                        "notify_email": True,
                        "notify_sms": True,
                    },
                )
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"    Announcements skipped: {e}"))

        for i, student in enumerate(students[:8]):
            try:
                Message.objects.get_or_create(
                    recipient_type="STUDENT",
                    recipient_id=student.id,
                    subject="Welcome to St. Mary's Nairobi High School",
                    defaults={
                        "body": (
                            f"Dear {student.first_name} {student.last_name},\n\n"
                            "Welcome to St. Mary's Nairobi High School for the 2025 academic year. "
                            "We are committed to providing you with a world-class education that builds "
                            "character, competence, and excellence.\n\n"
                            "Please ensure all fee payments are completed by 14th February 2025.\n\n"
                            "Yours sincerely,\nThe Principal"
                        ),
                        "status": "SENT",
                    },
                )
            except Exception:
                pass
