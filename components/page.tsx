// Frame for normal-scroll pages: clears the fixed header, caps the width and keeps the side gutter.
export function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-page flex-1 px-gutter pt-page-top pb-24">{children}</main>;
}
