import { useLocation } from 'react-router-dom'
import { SidebarSearch } from './SidebarSearch'
import { ContactMenu } from './ContactMenu'
import ConversationList from './ConversationList'

export const SidebarSecondary = () => {
  const location = useLocation()
  const isContactsRoute = location.pathname.startsWith('/contacts')

  return (
    <aside className="w-[344px] bg-white border-r border-[#e5e7eb] flex flex-col flex-shrink-0 z-10 transition-all duration-300">
      {isContactsRoute ? (
        /* Contacts Menu Sidebar */
        <div className="flex flex-col h-full">
          <SidebarSearch />
          <ContactMenu />
        </div>
      ) : (
        /* Chat List Sidebar (Default) */
        <div className="flex flex-col h-full">
          <SidebarSearch />
          <ConversationList />
        </div>
      )}
    </aside>
  )
}
