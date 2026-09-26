"""Rebuilds the syllabus into the merged nuclear + atomic-structure tree, in both languages.

Reads the existing syllabus so every module and topic id survives byte-identical — those ids are
embedded in the progress log, so a rename would silently orphan completed work. Then adds the new
atomic-structure / MCDHF / GRASP modules and reassembles everything into the new phase order.

Emits syllabus.yaml and syllabus.ar.yaml from one source, so the two trees cannot drift apart.
"""
import pathlib, re, yaml

ROOT = pathlib.Path("content/syllabi/nuclear-physics")
existing = yaml.safe_load((ROOT / "syllabus.yaml").read_text(encoding="utf-8"))

# Index the existing modules by id so they can be reordered without being rewritten.
MOD = {m["id"]: m for p in existing["phases"] for m in p["modules"]}

L, I, C, P = "lesson", "implementation", "checkpoint", "project"


def slug(text):
    s = text.lower()
    s = re.sub(r"[()\[\],:'’‑/]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


# ---------------------------------------------------------------- new modules
# (module_id, en_title, ar_title, group_en, group_ar, critical, [(kind, en, ar), ...])
NEW = [
    ("m11.1", "11.1 Relativistic Quantum Mechanics", "11.1 ميكانيكا الكم النسبية",
     "Module 11 — Quantum Mechanics for Atoms", "الوحدة 11 — ميكانيكا الكم للذرات", True, [
        (L, "Why relativity matters for atoms", "ليه النسبية مهمة للذرات"),
        (L, "Failures of the Schrodinger equation", "أين تفشل معادلة شرودنجر"),
        (L, "The Klein-Gordon equation and its problems", "معادلة كلاين-جوردون ومشاكلها"),
        (L, "The Dirac equation", "معادلة ديراك"),
        (L, "Dirac matrices and spinors", "مصفوفات ديراك والسبينورات"),
        (L, "Large and small components", "المركبتان الكبيرة والصغيرة"),
        (L, "Negative energy solutions", "حلول الطاقة السالبة"),
        (C, "Checkpoint 11.1", "نقطة مراجعة 11.1"),
     ]),
    ("m11.2", "11.2 The Dirac Equation in a Central Field", "11.2 معادلة ديراك في مجال مركزي",
     "Module 11 — Quantum Mechanics for Atoms", "الوحدة 11 — ميكانيكا الكم للذرات", True, [
        (L, "Separation in spherical coordinates", "الفصل في الإحداثيات الكروية"),
        (L, "The quantum number kappa", "العدد الكمي كابا"),
        (L, "The radial Dirac equations", "معادلات ديراك القطرية"),
        (L, "Dirac orbitals", "أوربيتالات ديراك"),
        (L, "Hydrogenic Dirac solutions", "حلول ديراك الهيدروجينية"),
        (L, "Fine structure from first principles", "البنية الدقيقة من المبادئ الأولى"),
        (L, "Relativistic contraction of s orbitals", "الانكماش النسبي لأوربيتالات s"),
        (C, "Checkpoint 11.2", "نقطة مراجعة 11.2"),
     ]),
    ("m11.3", "11.3 Many-Electron Atoms", "11.3 الذرات متعددة الإلكترونات",
     "Module 11 — Quantum Mechanics for Atoms", "الوحدة 11 — ميكانيكا الكم للذرات", True, [
        (L, "The N-electron Hamiltonian", "هاميلتوني N إلكترون"),
        (L, "Slater determinants", "محددات سليتر"),
        (L, "Subshells and occupation", "الأغلفة الفرعية والإشغال"),
        (L, "jj coupling", "اقتران jj"),
        (L, "LSJ coupling and when each applies", "اقتران LSJ ومتى نستخدم كل واحد"),
        (L, "Configuration state functions", "دوال حالة التوزيع (CSF)"),
        (L, "Atomic state functions", "دوال الحالة الذرية (ASF)"),
        (L, "Parity and J blocks", "التماثل وكتل J"),
        (C, "Checkpoint 11.3", "نقطة مراجعة 11.3"),
     ]),

    ("m12.1", "12.1 The Variational Method for Atoms", "12.1 الطريقة التغايرية للذرات",
     "Module 12 — MCDHF Theory", "الوحدة 12 — نظرية MCDHF", False, [
        (L, "The Rayleigh-Ritz principle", "مبدأ رايلي-ريتز"),
        (L, "The energy functional", "دالّية الطاقة"),
        (L, "Optimal level and extended optimal level", "المستوى الأمثل والمستوى الأمثل الممتد"),
        (L, "Level weights", "أوزان المستويات"),
        (C, "Checkpoint 12.1", "نقطة مراجعة 12.1"),
     ]),
    ("m12.2", "12.2 The MCDHF Equations", "12.2 معادلات MCDHF",
     "Module 12 — MCDHF Theory", "الوحدة 12 — نظرية MCDHF", True, [
        (L, "Deriving the MCDHF equations", "اشتقاق معادلات MCDHF"),
        (L, "The self-consistent field procedure", "إجراء المجال ذاتي الاتساق"),
        (L, "Convergence and how it fails", "التقارب وكيف يفشل"),
        (L, "Spectroscopic and correlation orbitals", "الأوربيتالات الطيفية والترابطية"),
        (C, "Checkpoint 12.2", "نقطة مراجعة 12.2"),
     ]),
    ("m12.3", "12.3 Electron Correlation and the Active Space", "12.3 الترابط الإلكتروني والفضاء النشط",
     "Module 12 — MCDHF Theory", "الوحدة 12 — نظرية MCDHF", True, [
        (L, "What electron correlation means", "معنى الترابط الإلكتروني"),
        (L, "Valence-valence correlation", "ترابط التكافؤ-التكافؤ"),
        (L, "Core-valence correlation", "ترابط القلب-التكافؤ"),
        (L, "Core-core correlation", "ترابط القلب-القلب"),
        (L, "The active space approach", "منهج الفضاء النشط"),
        (L, "Single and double excitations", "الإثارات الأحادية والثنائية"),
        (L, "Layer-by-layer convergence", "التقارب طبقة بعد طبقة"),
        (I, "CSF growth and computational cost", "نمو عدد CSF والتكلفة الحسابية"),
        (C, "Checkpoint 12.3", "نقطة مراجعة 12.3"),
     ]),
    ("m12.4", "12.4 Breit Interaction and QED", "12.4 تفاعل برايت وتصحيحات QED",
     "Module 12 — MCDHF Theory", "الوحدة 12 — نظرية MCDHF", True, [
        (L, "Beyond the Dirac-Coulomb Hamiltonian", "ما بعد هاميلتوني ديراك-كولوم"),
        (L, "The transverse photon interaction", "تفاعل الفوتون المستعرض"),
        (L, "Vacuum polarisation", "استقطاب الفراغ"),
        (L, "Self-energy", "الطاقة الذاتية"),
        (L, "Normal and specific mass shifts", "الإزاحات الكتلية العادية والنوعية"),
        (L, "Relativistic configuration interaction", "تفاعل التوزيعات النسبي (RCI)"),
        (C, "Checkpoint 12.4", "نقطة مراجعة 12.4"),
     ]),

    ("m13.1", "13.1 Multipole Radiation", "13.1 الإشعاع متعدد الأقطاب",
     "Module 13 — Radiative Transitions", "الوحدة 13 — الانتقالات الإشعاعية", False, [
        (L, "The multipole expansion of the radiation field", "مفكوك متعدد الأقطاب لمجال الإشعاع"),
        (L, "Electric and magnetic multipoles", "الأقطاب الكهربية والمغناطيسية"),
        (L, "E1, M1, E2 and M2 transitions", "انتقالات E1 و M1 و E2 و M2"),
        (L, "Selection rules", "قواعد الاختيار"),
        (L, "Parity and angular momentum in transitions", "التماثل والزخم الزاوي في الانتقالات"),
        (C, "Checkpoint 13.1", "نقطة مراجعة 13.1"),
     ]),
    ("m13.2", "13.2 Transition Quantities", "13.2 كميات الانتقال",
     "Module 13 — Radiative Transitions", "الوحدة 13 — الانتقالات الإشعاعية", True, [
        (L, "Line strength", "قوة الخط"),
        (L, "Weighted oscillator strength", "قوة المذبذب الموزونة"),
        (L, "Transition probability", "احتمالية الانتقال"),
        (L, "Lifetimes and branching ratios", "الأعمار ونسب التفرع"),
        (L, "Babushkin and Coulomb gauges", "معياري بابوشكين وكولوم"),
        (L, "Gauge agreement as an accuracy indicator", "توافق المعيارين كمؤشر للدقة"),
        (C, "Checkpoint 13.2", "نقطة مراجعة 13.2"),
     ]),

    ("m14.1", "14.1 Getting GRASP Running", "14.1 تشغيل GRASP",
     "Module 14 — GRASP2018 in Practice", "الوحدة 14 — GRASP2018 عمليًا", False, [
        (I, "Building GRASP2018", "بناء GRASP2018"),
        (L, "File conventions and the working directory", "اصطلاحات الملفات ومجلد العمل"),
        (L, "The program chain at a glance", "سلسلة البرامج في لمحة"),
        (C, "Checkpoint 14.1", "نقطة مراجعة 14.1"),
     ]),
    ("m14.2", "14.2 The Program Chain", "14.2 سلسلة البرامج",
     "Module 14 — GRASP2018 in Practice", "الوحدة 14 — GRASP2018 عمليًا", True, [
        (L, "rnucleus: the nuclear model", "rnucleus: النموذج النووي"),
        (L, "rcsfgenerate: building the CSF list", "rcsfgenerate: بناء قائمة CSF"),
        (L, "rangular: angular coefficients", "rangular: المعاملات الزاوية"),
        (L, "rwfnestimate: initial orbitals", "rwfnestimate: الأوربيتالات الابتدائية"),
        (L, "rmcdhf: the SCF calculation", "rmcdhf: حساب SCF"),
        (L, "rci: Breit and QED", "rci: برايت و QED"),
        (L, "jj2lsj: spectroscopic labels", "jj2lsj: التسميات الطيفية"),
        (L, "rlevels: the energy table", "rlevels: جدول الطاقات"),
        (L, "rbiotransform: biorthogonal orbitals", "rbiotransform: الأوربيتالات المتعامدة حيويًا"),
        (L, "rtransition: transition data", "rtransition: بيانات الانتقالات"),
        (I, "Run a complete calculation end to end", "شغّل حسابًا كاملًا من البداية للنهاية"),
        (C, "Checkpoint 14.2", "نقطة مراجعة 14.2"),
     ]),
    ("m14.3", "14.3 Strategy and Failures", "14.3 الاستراتيجية والأعطال",
     "Module 14 — GRASP2018 in Practice", "الوحدة 14 — GRASP2018 عمليًا", True, [
        (L, "Orbital freezing strategy", "استراتيجية تجميد الأوربيتالات"),
        (L, "Restarting from converged orbitals", "إعادة البدء من أوربيتالات متقاربة"),
        (L, "Diagnosing non-convergence", "تشخيص عدم التقارب"),
        (L, "Common errors and what they mean", "الأخطاء الشائعة ومعناها"),
        (L, "Estimating runtime and memory", "تقدير زمن التشغيل والذاكرة"),
        (I, "Running with MPI", "التشغيل باستخدام MPI"),
        (C, "Checkpoint 14.3", "نقطة مراجعة 14.3"),
     ]),

    ("m15.1", "15.1 Working with GRASP Output", "15.1 التعامل مع مخرجات GRASP",
     "Module 15 — Analysis and Publication", "الوحدة 15 — التحليل والنشر", False, [
        (L, "Reading the rlevels table", "قراءة جدول rlevels"),
        (L, "LSJ composition files", "ملفات تركيب LSJ"),
        (L, "Transition output files", "ملفات مخرجات الانتقالات"),
        (I, "Automating extraction with Python", "أتمتة الاستخراج بـ Python"),
        (C, "Checkpoint 15.1", "نقطة مراجعة 15.1"),
     ]),
    ("m15.2", "15.2 Uncertainty and Validation", "15.2 عدم اليقين والتحقق",
     "Module 15 — Analysis and Publication", "الوحدة 15 — التحليل والنشر", True, [
        (L, "Layer-to-layer convergence as uncertainty", "التقارب بين الطبقات كتقدير لعدم اليقين"),
        (L, "Comparing with NIST ASD", "المقارنة مع قاعدة NIST ASD"),
        (L, "Comparing with other theoretical work", "المقارنة مع الأعمال النظرية الأخرى"),
        (L, "Gauge agreement as validation", "توافق المعيارين كوسيلة تحقق"),
        (C, "Checkpoint 15.2", "نقطة مراجعة 15.2"),
     ]),
    ("m15.3", "15.3 Writing the Paper", "15.3 كتابة الورقة البحثية",
     "Module 15 — Analysis and Publication", "الوحدة 15 — التحليل والنشر", False, [
        (L, "Structure of a JQSRT-style paper", "بنية ورقة على نمط JQSRT"),
        (L, "Building the tables", "بناء الجداول"),
        (L, "Figures that carry the argument", "الأشكال التي تحمل الحجة"),
        (L, "Responding to referees", "الرد على المحكّمين"),
        (C, "Checkpoint 15.3", "نقطة مراجعة 15.3"),
     ]),

    ("m16.1", "Reproduce Zr XXXV", "إعادة إنتاج Zr XXXV",
     "Module 16 — MCDHF Research Projects", "الوحدة 16 — مشاريع بحث MCDHF", True, [
        (P, "Read the 2020 paper closely", "اقرأ ورقة 2020 بتمعّن"),
        (P, "Set up the C-like Zr calculation", "جهّز حساب Zr الشبيه بالكربون"),
        (P, "Run the MR layer", "شغّل طبقة MR"),
        (P, "Extend to n equals 4", "وسّع إلى n = 4"),
        (P, "Extend to n equals 5 and 6", "وسّع إلى n = 5 و 6"),
        (P, "Compare energies with the published table", "قارن الطاقات بالجدول المنشور"),
        (P, "Compare transition data", "قارن بيانات الانتقالات"),
        (P, "Explain any disagreement", "فسّر أي اختلاف"),
        (C, "Reproduction validated", "تم التحقق من إعادة الإنتاج"),
     ]),
    ("m16.2", "Original Calculation", "حساب أصلي",
     "Module 16 — MCDHF Research Projects", "الوحدة 16 — مشاريع بحث MCDHF", True, [
        (P, "Survey the literature for a gap", "امسح الأدبيات بحثًا عن فجوة"),
        (P, "Choose the ion and justify it", "اختر الأيون وبرّر الاختيار"),
        (P, "Design the active space", "صمّم الفضاء النشط"),
        (P, "Run the layer sequence", "شغّل تتابع الطبقات"),
        (P, "Estimate uncertainties", "قدّر عدم اليقين"),
        (P, "Build the tables and figures", "ابنِ الجداول والأشكال"),
        (P, "Draft the paper", "اكتب مسودة الورقة"),
        (P, "Internal review and revision", "مراجعة داخلية وتنقيح"),
        (C, "Ready for submission", "جاهز للتقديم"),
     ]),
]

ESTIMATES = {L: 45, I: 90, C: 30, P: 120}

# Build the new module dicts, chaining prerequisites within each module.
prev_checkpoint = None
new_mods_en, new_mods_ar = {}, {}

for mod_id, en_title, ar_title, group_en, group_ar, critical, topics in NEW:
    t_en, t_ar, ids = [], [], []
    prev = None
    for kind, en, ar in topics:
        tid = f"{mod_id}-{slug(en)}"
        ids.append(tid)
        if kind == C:
            reqs = ids[:-1]
        elif prev:
            reqs = [prev]
        elif prev_checkpoint:
            reqs = [prev_checkpoint]
        else:
            reqs = []
        base = {"id": tid, "estimatedMinutes": ESTIMATES[kind]}
        if kind != L:
            base["kind"] = kind
        if critical:
            base["critical"] = True
        if reqs:
            base["requires"] = reqs
        t_en.append({**base, "title": en})
        t_ar.append({**base, "title": ar})
        prev = tid
    prev_checkpoint = ids[-1]

    new_mods_en[mod_id] = {"id": mod_id, "title": en_title, "group": group_en, "topics": t_en}
    new_mods_ar[mod_id] = {"id": mod_id, "title": ar_title, "group": group_ar, "topics": t_ar}

# ------------------------------------------------- the merged phase structure
PHASES = [
    ("p1", "Phase 1 — Mathematical Foundations", "المرحلة 1 — الأسس الرياضية",
     "The mathematics both tracks are written in.",
     "الرياضيات اللي المسارين مكتوبين بيها.",
     ["m1.1", "m1.2", "m1.3", "m1.4", "m2.1", "m2.2", "m2.3"]),
    ("p2", "Phase 2 — Quantum Mechanics for Atoms", "المرحلة 2 — ميكانيكا الكم للذرات",
     "Relativistic quantum mechanics, the Dirac equation, and the many-electron structure MCDHF is built on.",
     "ميكانيكا الكم النسبية، ومعادلة ديراك، وبنية الذرة متعددة الإلكترونات اللي MCDHF متبني عليها.",
     ["m11.1", "m11.2", "m11.3"]),
    ("p3", "Phase 3 — Scattering and Nuclear Theory", "المرحلة 3 — التشتت والنظرية النووية",
     "Scattering theory, nuclear structure and reactions.",
     "نظرية التشتت وبنية النواة والتفاعلات النووية.",
     ["m3.1", "m3.2", "m3.3", "m3.4", "m4.1", "m4.2", "m4.3", "m4.4",
      "m5.1", "m5.2", "m5.3", "m5.4", "m5.5", "m6.1", "m6.2", "m6.3", "m6.4"]),
    ("p4", "Phase 4 — MCDHF Theory", "المرحلة 4 — نظرية MCDHF",
     "The variational method, electron correlation, and the physics beyond Dirac-Coulomb.",
     "الطريقة التغايرية، والترابط الإلكتروني، والفيزياء بعد ديراك-كولوم.",
     ["m12.1", "m12.2", "m12.3", "m12.4"]),
    ("p5", "Phase 5 — Radiative Transitions", "المرحلة 5 — الانتقالات الإشعاعية",
     "Multipole radiation and the quantities the papers actually report.",
     "الإشعاع متعدد الأقطاب والكميات اللي الأوراق بتنشرها فعلًا.",
     ["m13.1", "m13.2"]),
    ("p6", "Phase 6 — Computational Skills", "المرحلة 6 — المهارات الحسابية",
     "Python, Fortran, and the nuclear data libraries.",
     "Python و Fortran ومكتبات البيانات النووية.",
     ["m7.1", "m7.2", "m8.1", "m8.2"]),
    ("p7", "Phase 7 — GRASP2018 in Practice", "المرحلة 7 — GRASP2018 عمليًا",
     "Every program in the chain, the strategy that makes it converge, and what to do when it does not.",
     "كل برنامج في السلسلة، والاستراتيجية اللي بتخليه يتقارب، وإيه تعمل لما ميتقاربش.",
     ["m14.1", "m14.2", "m14.3"]),
    ("p8", "Phase 8 — Analysis, Uncertainty and Publication", "المرحلة 8 — التحليل وعدم اليقين والنشر",
     "Turning output files into a defensible result, and a result into a paper.",
     "تحويل ملفات المخرجات لنتيجة قابلة للدفاع عنها، والنتيجة لورقة بحثية.",
     ["m15.1", "m15.2", "m15.3", "m9.1"]),
    ("p9", "Phase 9 — Research Projects", "المرحلة 9 — مشاريع البحث",
     "Three projects: the TALYS calculation, a reproduction, and an original result.",
     "تلات مشاريع: حساب TALYS، وإعادة إنتاج، ونتيجة أصلية.",
     ["m10.1", "m16.1", "m16.2"]),
]

# Arabic titles for the existing modules. Topic titles stay English where not yet translated —
# structural parity is what matters, and an untranslated title is honest rather than wrong.
MODULE_AR = {
    "m1.1": ("1.1 الجبر الخطي لميكانيكا الكم", "الوحدة 1 — رياضيات ميكانيكا الكم"),
    "m1.2": ("1.2 المعادلات التفاضلية", "الوحدة 1 — رياضيات ميكانيكا الكم"),
    "m1.3": ("1.3 التحليل المركب", "الوحدة 1 — رياضيات ميكانيكا الكم"),
    "m1.4": ("1.4 الطرق العددية", "الوحدة 1 — رياضيات ميكانيكا الكم"),
    "m2.1": ("2.1 الزخم الزاوي المداري", "الوحدة 2 — نظرية الزخم الزاوي"),
    "m2.2": ("2.2 الزخم الزاوي المغزلي", "الوحدة 2 — نظرية الزخم الزاوي"),
    "m2.3": ("2.3 جمع الزخوم الزاوية", "الوحدة 2 — نظرية الزخم الزاوي"),
    "m3.1": ("3.1 مفاهيم التشتت الأساسية", "الوحدة 3 — نظرية التشتت"),
    "m3.2": ("3.2 تحليل الموجات الجزئية", "الوحدة 3 — نظرية التشتت"),
    "m3.3": ("3.3 تشتت الرنين", "الوحدة 3 — نظرية التشتت"),
    "m3.4": ("3.4 النموذج البصري", "الوحدة 3 — نظرية التشتت"),
    "m4.1": ("4.1 الخواص النووية الأساسية", "الوحدة 4 — البنية النووية"),
    "m4.2": ("4.2 نموذج الأغلفة النووي", "الوحدة 4 — البنية النووية"),
    "m4.3": ("4.3 الحركة الجماعية", "الوحدة 4 — البنية النووية"),
    "m4.4": ("4.4 كثافة المستويات النووية", "الوحدة 4 — البنية النووية"),
    "m5.1": ("5.1 آليات التفاعل", "الوحدة 5 — التفاعلات النووية"),
    "m5.2": ("5.2 نموذج النواة المركبة", "الوحدة 5 — التفاعلات النووية"),
    "m5.3": ("5.3 نظرية هاوزر-فيشباخ", "الوحدة 5 — التفاعلات النووية"),
    "m5.4": ("5.4 نفاذية أشعة جاما", "الوحدة 5 — التفاعلات النووية"),
    "m5.5": ("5.5 الانشطار", "الوحدة 5 — التفاعلات النووية"),
    "m6.1": ("6.1 المنطقة الحرارية والرنينية", "الوحدة 6 — أسر النيوترون"),
    "m6.2": ("6.2 منطقة الرنين غير المحلول", "الوحدة 6 — أسر النيوترون"),
    "m6.3": ("6.3 منطقة النيوترونات السريعة", "الوحدة 6 — أسر النيوترون"),
    "m6.4": ("6.4 المقاطع العرضية بمتوسط ماكسويل", "الوحدة 6 — أسر النيوترون"),
    "m7.1": ("7.1 Python للفيزياء النووية", "الوحدة 7 — البرمجة"),
    "m7.2": ("7.2 أساسيات Fortran", "الوحدة 7 — البرمجة"),
    "m8.1": ("8.1 إتقان TALYS", "الوحدة 8 — البيانات والبرامج النووية"),
    "m8.2": ("8.2 قواعد البيانات النووية", "الوحدة 8 — البيانات والبرامج النووية"),
    "m9.1": ("9.1 الأدبيات والكتابة", "الوحدة 9 — منهجية البحث"),
    "m10.1": ("مشروع Th-232(n,gamma)", "الوحدة 10 — مشروع بحثي"),
}

# Topic titles already translated (Module 1.1, which has Arabic lessons).
TOPIC_AR = {
    "m1.1-vector-spaces-basics": "أساسيات الفضاءات المتجهية",
    "m1.1-hilbert-spaces": "فضاءات هيلبرت",
    "m1.1-dirac-notation-bra-ket": "ترميز ديراك (bra-ket)",
    "m1.1-inner-products": "الضرب الداخلي",
    "m1.1-linear-operators": "المؤثرات الخطية",
    "m1.1-matrix-representation": "التمثيل المصفوفي",
    "m1.1-eigenvalue-problems": "مسائل القيم الذاتية",
    "m1.1-hermitian-operators": "المؤثرات الهرميتية",
    "m1.1-commutators": "المبدلات",
    "m1.1-unitary-transformations": "التحويلات الوحدوية",
    "m1.1-checkpoint-1-1": "نقطة مراجعة 1.1",
}


def build(lang):
    phases = []
    for pid, en_t, ar_t, en_s, ar_s, mod_ids in PHASES:
        mods = []
        for mid in mod_ids:
            if mid in new_mods_en:
                mods.append(new_mods_ar[mid] if lang == "ar" else new_mods_en[mid])
                continue

            src = MOD[mid]
            if lang == "en":
                mods.append(src)
                continue

            ar_title, ar_group = MODULE_AR.get(mid, (src["title"], src.get("group", "")))
            mods.append({
                **src,
                "title": ar_title,
                **({"group": ar_group} if ar_group else {}),
                "topics": [
                    {**t, "title": TOPIC_AR.get(t["id"], t["title"])} for t in src["topics"]
                ],
            })

        phases.append({
            "id": pid,
            "title": ar_t if lang == "ar" else en_t,
            "summary": ar_s if lang == "ar" else en_s,
            "modules": mods,
        })

    return {
        "schemaVersion": 1,
        "id": "nuclear-physics",
        "title": "الفيزياء الذرية والنووية الحسابية" if lang == "ar"
                 else "Computational Atomic & Nuclear Physics",
        "subtitle": "من الرياضيات إلى حسابات MCDHF منشورة" if lang == "ar"
                    else "From the mathematics to published MCDHF calculations",
        "description": (
            "مسار متكامل: الأسس الرياضية، ميكانيكا الكم النسبية، نظرية MCDHF، GRASP2018 عمليًا، "
            "وينتهي بحساب أصلي مكتوب للنشر." if lang == "ar" else
            "A single path: mathematical foundations, relativistic quantum mechanics, MCDHF theory, "
            "GRASP2018 in practice, ending in an original calculation written up for publication."
        ),
        "goal": "إنتاج حسابات MCDHF قابلة للنشر" if lang == "ar"
                else "Produce publishable MCDHF atomic structure calculations",
        "phases": phases,
    }


class Dumper(yaml.SafeDumper):
    pass


def str_presenter(dumper, data):
    style = "|" if "\n" in data else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style=style)


Dumper.add_representer(str, str_presenter)

HEADER = {
    "en": "# Computational Atomic & Nuclear Physics.\n"
          "#\n"
          "# GENERATED. Module and topic ids are load-bearing: progress in data/events.jsonl is\n"
          "# keyed on them, so renaming one orphans completed work. syllabus.ar.yaml is produced\n"
          "# from the same source and must keep identical ids; validate:content enforces it.\n\n",
    "ar": "# الفيزياء الذرية والنووية الحسابية — شجرة المنهج بالعربية.\n"
          "#\n"
          "# مولّد آليًا. المعرّفات (ids) مطابقة للنسخة الإنجليزية بالظبط، والعناوين فقط مترجمة.\n"
          "# العناوين اللي لسه مترجمتش بتفضل بالإنجليزي — التطابق البنيوي هو المهم.\n\n",
}

for lang, name in (("en", "syllabus.yaml"), ("ar", "syllabus.ar.yaml")):
    data = build(lang)
    body = yaml.dump(data, Dumper=Dumper, allow_unicode=True, sort_keys=False, width=100)
    (ROOT / name).write_text(HEADER[lang] + body, encoding="utf-8")
    topics = sum(len(m["topics"]) for p in data["phases"] for m in p["modules"])
    mods = sum(len(p["modules"]) for p in data["phases"])
    print(f"{name}: {len(data['phases'])} phases, {mods} modules, {topics} topics")
