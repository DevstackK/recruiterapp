export default async function ApplyPage({
  params,
}: {
  params: Promise<{ jobSlug: string }>;
}) {
  const { jobSlug } = await params;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Apply</h1>
      <p className="text-sm text-muted-foreground">
        CV upload for job &quot;{jobSlug}&quot; lands in Phase 2.
      </p>
    </div>
  );
}
