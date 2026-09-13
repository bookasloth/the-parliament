export function SidebarFooter() {
  const link = "hover:text-gray-700 transition-colors"
  return (
    <div className="px-2 pb-2 text-center text-[11px] leading-relaxed text-gray-400">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <a href="/about" className={link}>About</a>
        <a href="/help" className={link}>Help</a>
        <a href="/privacy" className={link}>Privacy</a>
        <a href="/terms" className={link}>Terms</a>
        <a href="/rules" className={link}>Rules</a>
      </div>
      <p className="mt-2 text-gray-400">
        Made by{" "}
        <a href="https://shubhamdatarkar.com/projects/nnawca" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-500 hover:text-brand">Durga</a>
        {" "}&amp;{" "}
        <a href="https://shubhamdatarkar.com/projects/nnawca" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-500 hover:text-brand">Shubham</a>
      </p>
    </div>
  )
}
