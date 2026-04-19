import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MessagesType } from "@/types/messages.type";

type MessageState = {
    messagesByConversation: Record<string, MessagesType[]>;
};

const initialState: MessageState = {
    messagesByConversation: {},
};

const messageSlice = createSlice({
    name: "message",
    initialState,
    reducers: {
        setMessages(
            state,
            action: PayloadAction<{
                conversationId: string;
                messages: MessagesType[];
            }>
        ) {
            state.messagesByConversation[action.payload.conversationId] =
                action.payload.messages;
        },

        updateReadReceipt(
            state,
            action: PayloadAction<{
                conversationId: string;
                messageId: string;
                userId: string;
                type: "read" | "unread";
            }>
        ) {
            const { conversationId, messageId, userId, type } = action.payload;

            const messages = state.messagesByConversation[conversationId];
            if (!messages) return;

            const msg = messages.find((m) => m._id === messageId);
            if (!msg) return;

            if (type === "read") {
                const exists = msg.readReceipts?.some(
                    (r) => r.userId._id === userId
                );

                if (!exists) {
                    msg.readReceipts.push({
                        userId: { _id: userId, profile: { name: "", avatarUrl: "" } },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                }
            } else {
                msg.readReceipts = msg.readReceipts.filter(
                    (r) => r.userId._id !== userId
                );
            }
        },
    },
});

export const { setMessages, updateReadReceipt } = messageSlice.actions;
export default messageSlice.reducer;