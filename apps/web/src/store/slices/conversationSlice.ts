import type { ConversationItemType } from "@/types/conversation-item.type"
import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type ConversationState = {
    conversations: ConversationItemType[]
}

const initialState: ConversationState = {
    conversations: []
}

const conversationSlice = createSlice({
    name: "conversation",
    initialState,
    reducers: {
        setConversations(state, action: PayloadAction<ConversationItemType[]>) {
            state.conversations = action.payload
        },

        togglePinConversation(state, action: PayloadAction<string>) {
            const c = state.conversations.find(
                (c) => c.conversationId === action.payload
            )
            if (c) c.pinned = !c.pinned
        },

        hideConversationLocal(state, action: PayloadAction<string>) {
            const c = state.conversations.find(
                (c) => c.conversationId === action.payload
            )
            if (c) c.hidden = !c.hidden
        },

        toggleMuteConversation(state, action: PayloadAction<string>) {
            const c = state.conversations.find(
                (c) => c.conversationId === action.payload
            )
            if (c) c.muted = !c.muted
        }
    }
})

export const { setConversations, togglePinConversation, hideConversationLocal, toggleMuteConversation } =
    conversationSlice.actions

export default conversationSlice.reducer