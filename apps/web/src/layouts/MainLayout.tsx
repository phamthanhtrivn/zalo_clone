import { Outlet } from 'react-router-dom'
import { SidebarPrimary } from '../components/layout/SidebarPrimary'
import { SidebarSecondary } from '../components/layout/SidebarSecondary'
import { TooltipProvider } from '../components/ui/tooltip'

const MainLayout = () => {
  return (
    <TooltipProvider>
      <div className="flex h-screen w-full bg-[#f4f7f9] overflow-hidden font-sans">
        {/* Primary Sidebar - Zalo Style (Blue) */}
        <SidebarPrimary />

        {/* Secondary Sidebar - Dynamic Content (White) */}
        <SidebarSecondary />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}

export default MainLayout
