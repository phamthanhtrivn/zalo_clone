import { useLocation } from "react-router-dom";
import { SidebarSearch } from "./SidebarSearch";
import { ContactMenu } from "./ContactMenu";
import ConversationList from "./ConversationList";
import { useEffect } from "react";
import { conversationService } from "@/services/conversation.service";
import { setConversations } from "@/store/slices/conversationSlice";

import { useAppDispatch, useAppSelector } from "@/store";

export const SidebarSecondary = () => {
  const location = useLocation();
  const isContactsRoute = location.pathname.startsWith("/contacts");

  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!user?.userId) return;
    const fetch = async () => {
      const res = await conversationService.getConversationsFromUserId(
        user?.userId,
      );

      if (res.success) {
        dispatch(setConversations(res.data));
      }
    };

    fetch();

  }, [dispatch, user?.userId]);

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
