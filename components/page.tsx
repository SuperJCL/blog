// Frame for normal-scroll pages: clears the fixed header, caps the width and keeps the side gutter.
// id and tabIndex make it the target of the skip link; it takes focus from there but shows no ring.
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-page flex-1 px-gutter pt-page-top pb-24 focus:outline-none">
      {children}
    </main>
  );
}
