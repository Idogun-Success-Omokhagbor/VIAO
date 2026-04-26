import { AppSpinner } from "@/components/ui/app-spinner"

export default function EventsLoading() {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-center rounded-[28px] border border-[#ece4ff] bg-white/88 px-6 py-16 shadow-[0_24px_60px_rgba(76,53,160,0.08)] backdrop-blur">
        <AppSpinner label="Loading events..." size="lg" fullHeight />
      </div>
    </div>
  )
}
