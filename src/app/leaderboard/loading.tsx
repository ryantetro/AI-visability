function LoadingRow() {
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="px-2 py-3 sm:px-4 sm:py-4">
        <div className="h-4 w-6 rounded bg-white/[0.08]" />
      </td>
      <td className="min-w-0 px-2 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/[0.08]" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-32 rounded bg-white/[0.08]" />
            <div className="mt-2 h-3 w-48 rounded bg-white/[0.05]" />
          </div>
        </div>
      </td>
      <td className="px-2 py-3 sm:px-4 sm:py-4">
        <div className="h-4 w-14 rounded bg-white/[0.08]" />
      </td>
      <td className="px-2 py-3 sm:px-4 sm:py-4">
        <div className="h-4 w-48 rounded bg-white/[0.08]" />
      </td>
      <td className="px-2 py-3 text-right sm:px-4 sm:py-4">
        <div className="ml-auto h-4 w-20 rounded bg-white/[0.08]" />
      </td>
    </tr>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mt-6">
        <div className="mx-auto h-10 w-56 animate-pulse rounded bg-white/[0.08]" />
        <div className="mx-auto mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-white/[0.05]" />

        <div className="mt-8">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-9 w-24 animate-pulse rounded-md bg-white/[0.08]"
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '3%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-2 py-3 text-left sm:px-4 sm:py-4">
                    <div className="h-3 w-4 rounded bg-white/[0.08]" />
                  </th>
                  <th className="px-2 py-3 text-left sm:px-4 sm:py-4">
                    <div className="h-3 w-10 rounded bg-white/[0.08]" />
                  </th>
                  <th className="px-2 py-3 text-left sm:px-4 sm:py-4">
                    <div className="h-3 w-14 rounded bg-white/[0.08]" />
                  </th>
                  <th className="px-2 py-3 text-left sm:px-4 sm:py-4">
                    <div className="h-3 w-12 rounded bg-white/[0.08]" />
                  </th>
                  <th className="px-2 py-3 text-right sm:px-4 sm:py-4">
                    <div className="ml-auto h-3 w-10 rounded bg-white/[0.08]" />
                  </th>
                </tr>
              </thead>
              <tbody className="animate-pulse">
                {Array.from({ length: 8 }).map((_, index) => (
                  <LoadingRow key={index} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
