import { Header } from '@/components/layout/Header'
import { CircuitCanvas } from '@/components/circuit/CircuitCanvas'

export default function SandboxPage() {
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-8">
        <h1 className="mb-1 text-xl font-bold text-fg">صمّم دائرتك</h1>
        <p className="mb-6 text-sm leading-relaxed text-fg-muted">
          اختر أداة، دوس نقطة وبعدين التانية عشان توصل بينهم. حدّد نقطة الأرضي (0V)، وشوف شدة
          التيار وفرق الجهد بيتحسبوا لحظة ما الدائرة تقفل.
        </p>
        <CircuitCanvas />
      </main>
    </div>
  )
}
