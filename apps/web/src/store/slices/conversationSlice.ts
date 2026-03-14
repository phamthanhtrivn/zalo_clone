import type { ConversationItemType } from "@/types/conversation-item.type"
import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type ConversationState = {
    conversations: ConversationItemType[]
}

const initialState: ConversationState = {
    conversations: []
}

const conversationSlice = createSlice({
    name: 'conversation',
    initialState,
    reducers: {
        setConversations(state, action: PayloadAction<ConversationItemType[]>) {
            state.conversations = action.payload;
        }
    }
})

export const { setConversations } = conversationSlice.actions
export default conversationSlice.reducer;