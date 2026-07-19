export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="splash-frame relative h-20 w-20">
        <span className="splash-corner splash-corner-tl" />
        <span className="splash-corner splash-corner-tr" />
        <span className="splash-corner splash-corner-bl" />
        <span className="splash-corner splash-corner-br" />
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tracking-tight text-foreground">
          RA
        </span>
        <span className="splash-scanline" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold text-foreground">Recruiter Agent</p>
        <p className="text-xs text-muted-foreground">Reading the pipeline…</p>
      </div>
    </div>
  );
}
