import { useLocation } from "react-router-dom";
import { SidebarSearch } from "./SidebarSearch";
import { ContactMenu } from "./ContactMenu";
import ConversationList from "./ConversationList";
import { useEffect } from "react";
import { conversationService } from "@/services/conversation.service";
import { setConversations } from "@/store/slices/conversationSlice";
import { useAppDispatch } from "@/store";

export const SidebarSecondary = () => {
  const location = useLocation();
  const isContactsRoute = location.pathname.startsWith("/contacts");
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetch = async () => {
      const res = await conversationService.getConversationsFromUserId("699d2b94f9075fe800282901");

      if (res.success) {
        dispatch(setConversations(res.data));
      }
    };

    fetch();
  }, [dispatch]);

  return (
    <aside className="w-86 bg-white border-r border-[#e5e7eb] flex flex-col shrink-0 z-10 transition-all duration-300">
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
  );
};
