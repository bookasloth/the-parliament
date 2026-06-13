import { PrivateNavbar } from "@/components/shared/PrivateNavbar"

/**
 * Layout for all authenticated (gated) pages.
 * The private navbar renders on every page in this route group;
 * it scrolls away naturally so each page's own sticky sub-header
 * (back button, page title) takes over on scroll.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PrivateNavbar />
      {children}
    </>
  )
}
