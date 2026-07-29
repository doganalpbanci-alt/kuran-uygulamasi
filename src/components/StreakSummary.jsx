// getDay() sırası: 0 Pazar, 1 Pazartesi, 2 Salı, 3 Çarşamba, 4 Perşembe, 5 Cuma, 6 Cumartesi
const WEEKDAY_LABELS = ["P", "P", "S", "Ç", "P", "C", "C"];

export default function StreakSummary({ streak, last7Days }) {
  return (
    <div className="rounded-2xl bg-teal-600 px-5 py-4 text-cream-50">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold">{streak}</span>
        <span className="text-sm text-cream-100/90">
          gün üst üste okuma
        </span>
      </div>

      <div className="mt-3 flex justify-between gap-1.5">
        {last7Days.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <span
              className={`h-4 w-4 rounded-full ${
                day.done ? "bg-gold-500" : "bg-cream-50/25"
              }`}
              title={day.date}
            />
            <span className="text-[10px] text-cream-100/70">
              {WEEKDAY_LABELS[new Date(day.date).getDay()] ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
