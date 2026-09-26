import type { Locale } from '@core/domain'

/**
 * Interface strings.
 *
 * A flat dictionary typed off the English keys, so adding a string without translating it is a
 * compile error rather than an English word appearing mid-sentence in Arabic.
 *
 * The Arabic is written to be read comfortably by an Egyptian reader: plain, direct phrasing
 * rather than formal newsreader Arabic, and technical terms kept in English where that is what
 * you will actually meet in a paper — "Hilbert space" is more useful to recognise than a
 * translation you would never see again.
 */

const en = {
  // Workspace chrome
  'nav.syllabus': 'Syllabus',
  'nav.complete': 'complete',
  'nav.awaitingReview': 'awaiting review',
  'nav.criticalTopic': 'Critical topic',
  'nav.locked': 'Locked',
  'nav.completeFirst': 'Complete first',

  'header.toggleSyllabus': 'Toggle syllabus panel',
  'header.toggleInstructor': 'Toggle instructor panel',
  'header.focusMode': 'Toggle focus mode',
  'header.settings': 'Settings',
  'header.scratchpad': 'Your working',
  'header.lightTheme': 'Switch to light theme',
  'header.darkTheme': 'Switch to dark theme',

  // Settings
  'settings.title': 'Settings',
  'settings.description': 'These apply everywhere. Each lesson can override the language on its own.',
  'settings.language': 'Language',
  'settings.languageHelp': 'Lessons and exercises are shown in this language where a translation exists.',
  'settings.theme': 'Theme',
  'settings.themeDark': 'Dark',
  'settings.themeLight': 'Light',
  'settings.mathNote': 'Equations always read left to right, in both languages.',
  'settings.pageOverride': 'This page',
  'settings.pageOverrideHelp': 'Show only this topic in a different language.',
  'settings.followGlobal': 'Follow settings',
  'settings.done': 'Done',

  // Lesson
  'lesson.readingTime': 'About {minutes} minutes of reading',
  'lesson.notWritten': 'No lesson written for {topic} yet.',
  'lesson.notWrittenHelp':
    'Ask in the instructor panel and I will write it. Lessons live in content/syllabi and appear here as soon as the file is saved.',
  'lesson.translationMissing': 'This topic has not been translated yet — showing the English version.',
  'lesson.translationMissingAction': 'Ask me to translate it',

  // Exercises
  'exercise.heading': 'Exercises',
  'exercise.intro': 'Numeric answers are checked instantly. Anything asking why goes to your instructor.',
  'exercise.set': 'Set {set}',
  'exercise.submit': 'Submit',
  'exercise.submitAgain': 'Submit again',
  'exercise.submitting': 'Submitting...',
  'exercise.ask': 'Ask',
  'exercise.hint': 'Hint',
  'exercise.showSolution': 'Show solution',
  'exercise.solution': 'Solution',
  'exercise.yourAnswer': 'Your answer',
  'exercise.yourReasoning': 'Your reasoning',
  'exercise.whyPlaceholder': 'Why is that the answer?',
  'exercise.expectedShape': 'Expected shape:',
  'exercise.correct': 'Correct',
  'exercise.partlyRight': 'Partly right',
  'exercise.notRight': 'Not right yet',
  'exercise.withInstructor': 'With instructor',
  'exercise.attempts': '{count} attempts',
  'exercise.checkedCorrect': 'Checked and correct.',
  'exercise.sentForReview':
    'Sent to your instructor for review. The reply will appear here and in the tutor panel — no need to refresh.',
  'exercise.instructorFeedback': 'Instructor feedback',

  // Tutor
  'tutor.title': 'Instructor',
  'tutor.live': 'live',
  'tutor.connecting': '...',
  'tutor.empty': 'No questions on this topic yet.',
  'tutor.emptyHelp':
    'Ask anything here, or use the question mark on an equation to ask about that exact step.',
  'tutor.placeholder': 'Ask about this topic...',
  'tutor.sendHint': 'Enter to send, Shift+Enter for a new line.',
  'tutor.send': 'Send question',
  'tutor.you': 'You',
  'tutor.instructor': 'Instructor',
  'tutor.queued': 'queued',
  'tutor.waiting': '{count} waiting for a reply',
  'tutor.answeredFrom':
    'Answered from Claude Code — run pnpm tutor in the terminal. The reply lands here on its own.',
  'tutor.askingAbout': 'Asking about',
  'tutor.clearContext': 'Clear question context',

  // Checkpoint
  'checkpoint.passed': 'Checkpoint passed',
  'checkpoint.passedHelp': '{topic} is marked complete. Anything that depends on it is now unlocked.',
  'checkpoint.mark': 'Mark this topic complete',
  'checkpoint.outstanding':
    '{count} exercises not yet settled. You can still mark it complete if you are confident.',
  'checkpoint.allSettled': 'Everything here is settled.',
  'checkpoint.notePlaceholder': 'Optional note to your future self',
  'checkpoint.markButton': 'Mark complete',
  'checkpoint.saving': 'Saving...',

  // Equations
  'equation.copy': 'Copy LaTeX',
  'equation.copied': 'LaTeX copied',
  'equation.ask': 'Ask about this equation',
} as const

export type StringKey = keyof typeof en

const ar: Record<StringKey, string> = {
  'nav.syllabus': 'المنهج',
  'nav.complete': 'مكتمل',
  'nav.awaitingReview': 'في انتظار المراجعة',
  'nav.criticalTopic': 'موضوع أساسي',
  'nav.locked': 'مقفول',
  'nav.completeFirst': 'لازم تخلّص الأول',

  'header.toggleSyllabus': 'إظهار أو إخفاء لوحة المنهج',
  'header.toggleInstructor': 'إظهار أو إخفاء لوحة المدرّس',
  'header.focusMode': 'وضع التركيز',
  'header.settings': 'الإعدادات',
  'header.scratchpad': 'مسوّداتك',
  'header.lightTheme': 'التبديل للوضع الفاتح',
  'header.darkTheme': 'التبديل للوضع الداكن',

  'settings.title': 'الإعدادات',
  'settings.description': 'دي بتتطبّق في كل مكان. وكل درس تقدر تغيّر لغته لوحده.',
  'settings.language': 'اللغة',
  'settings.languageHelp': 'الدروس والتمارين هتظهر باللغة دي طالما الترجمة متوفرة.',
  'settings.theme': 'المظهر',
  'settings.themeDark': 'داكن',
  'settings.themeLight': 'فاتح',
  'settings.mathNote': 'المعادلات دايمًا بتتقرا من الشمال لليمين، في اللغتين.',
  'settings.pageOverride': 'الصفحة دي',
  'settings.pageOverrideHelp': 'اعرض الموضوع ده بلغة مختلفة عن الباقي.',
  'settings.followGlobal': 'حسب الإعدادات',
  'settings.done': 'تمام',

  'lesson.readingTime': 'حوالي {minutes} دقيقة قراءة',
  'lesson.notWritten': 'لسه مفيش درس متكتب لـ {topic}.',
  'lesson.notWrittenHelp':
    'اسألني في لوحة المدرّس وأنا هكتبه. الدروس موجودة في content/syllabi وبتظهر هنا أول ما الملف يتحفظ.',
  'lesson.translationMissing': 'الموضوع ده لسه مترجمش — دي النسخة الإنجليزية.',
  'lesson.translationMissingAction': 'اطلب مني أترجمه',

  'exercise.heading': 'تمارين',
  'exercise.intro': 'الإجابات الرقمية بتتصحّح فورًا. وأي سؤال بيقول «ليه» بيروح للمدرّس.',
  'exercise.set': 'مجموعة {set}',
  'exercise.submit': 'سلّم',
  'exercise.submitAgain': 'سلّم تاني',
  'exercise.submitting': 'جاري التسليم...',
  'exercise.ask': 'اسأل',
  'exercise.hint': 'تلميح',
  'exercise.showSolution': 'اعرض الحل',
  'exercise.solution': 'الحل',
  'exercise.yourAnswer': 'إجابتك',
  'exercise.yourReasoning': 'سبب إجابتك',
  'exercise.whyPlaceholder': 'ليه دي الإجابة؟',
  'exercise.expectedShape': 'الشكل المتوقع:',
  'exercise.correct': 'صح',
  'exercise.partlyRight': 'صح جزئيًا',
  'exercise.notRight': 'لسه مش مظبوط',
  'exercise.withInstructor': 'عند المدرّس',
  'exercise.attempts': '{count} محاولات',
  'exercise.checkedCorrect': 'اتصحّحت وطلعت صح.',
  'exercise.sentForReview':
    'اتبعتت للمدرّس للمراجعة. الرد هيظهر هنا وفي لوحة المدرّس — مش محتاج تعمل تحديث.',
  'exercise.instructorFeedback': 'ملاحظات المدرّس',

  'tutor.title': 'المدرّس',
  'tutor.live': 'متصل',
  'tutor.connecting': '...',
  'tutor.empty': 'لسه مفيش أسئلة على الموضوع ده.',
  'tutor.emptyHelp': 'اسأل أي حاجة هنا، أو استخدم علامة الاستفهام جنب أي معادلة عشان تسأل عنها بالذات.',
  'tutor.placeholder': 'اسأل عن الموضوع ده...',
  'tutor.sendHint': 'Enter للإرسال، وShift+Enter لسطر جديد.',
  'tutor.send': 'ابعت السؤال',
  'tutor.you': 'إنت',
  'tutor.instructor': 'المدرّس',
  'tutor.queued': 'في الطابور',
  'tutor.waiting': '{count} في انتظار الرد',
  'tutor.answeredFrom':
    'الرد بيجي من Claude Code — شغّل pnpm tutor في الterminal. الرد هيوصل هنا لوحده.',
  'tutor.askingAbout': 'بتسأل عن',
  'tutor.clearContext': 'امسح سياق السؤال',

  'checkpoint.passed': 'اتعدّت نقطة المراجعة',
  'checkpoint.passedHelp': '{topic} اتعلّم كمكتمل. أي حاجة معتمدة عليه اتفتحت دلوقتي.',
  'checkpoint.mark': 'علّم الموضوع ده كمكتمل',
  'checkpoint.outstanding': 'فيه {count} تمارين لسه متحلّتش. تقدر تعلّمه مكتمل برضه لو واثق.',
  'checkpoint.allSettled': 'كل حاجة هنا خلصت.',
  'checkpoint.notePlaceholder': 'ملاحظة اختيارية لنفسك في المستقبل',
  'checkpoint.markButton': 'علّم كمكتمل',
  'checkpoint.saving': 'جاري الحفظ...',

  'equation.copy': 'انسخ LaTeX',
  'equation.copied': 'اتنسخت',
  'equation.ask': 'اسأل عن المعادلة دي',
}

const DICTIONARIES: Record<Locale, Record<StringKey, string>> = { en, ar }

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string

/**
 * Builds a lookup for one locale.
 * `{name}` placeholders are substituted; an unknown key returns the key itself, which is loud
 * enough to notice in review but harmless in front of a learner.
 */
export function translator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale] ?? en

  return (key, vars) => {
    const template = dictionary[key] ?? en[key] ?? key
    if (!vars) return template

    return Object.entries(vars).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template,
    )
  }
}
