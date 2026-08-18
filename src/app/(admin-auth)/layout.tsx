// Standalone light shell for the admin console login — deliberately OUTSIDE the
// member (auth) group so it doesn't inherit the light, NetworkPanel-branded
// member auth layout. Matches the admin console aesthetic (light, Poppins,
// blue-600) so staff land somewhere visibly different from the member sign-in.
export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4 py-10">
      {children}
    </div>
  )
}
