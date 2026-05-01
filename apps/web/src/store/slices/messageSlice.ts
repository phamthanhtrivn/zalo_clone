import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MessagesType, PollType, PollOptionType } from "@/types/messages.type";

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

        prependMessages(
            state,
            action: PayloadAction<{
                conversationId: string;
                messages: MessagesType[];
            }>
        ) {
            const { conversationId, messages } = action.payload;
            if (!state.messagesByConversation[conversationId]) {
                state.messagesByConversation[conversationId] = [];
            }
            const existingIds = new Set(state.messagesByConversation[conversationId].map(m => m._id));
            const newMessages = messages.filter(m => !existingIds.has(m._id));
            state.messagesByConversation[conversationId] = [...newMessages, ...state.messagesByConversation[conversationId]];
        },

        appendMessages(
            state,
            action: PayloadAction<{
                conversationId: string;
                messages: MessagesType[];
            }>
        ) {
            const { conversationId, messages } = action.payload;
            if (!state.messagesByConversation[conversationId]) {
                state.messagesByConversation[conversationId] = [];
            }
            const existingIds = new Set(state.messagesByConversation[conversationId].map(m => m._id));
            const newMessages = messages.filter(m => !existingIds.has(m._id));
            state.messagesByConversation[conversationId] = [...state.messagesByConversation[conversationId], ...newMessages];
        },

        addMessage(
            state,
            action: PayloadAction<{
                conversationId: string;
                message: MessagesType;
            }>
        ) {
            const { conversationId, message } = action.payload;
            if (!state.messagesByConversation[conversationId]) {
                state.messagesByConversation[conversationId] = [];
            }
            const exists = state.messagesByConversation[conversationId].some(m => m._id === message._id);
            if (!exists) {
                state.messagesByConversation[conversationId].push(message);
            }
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

            if (!msg.readReceipts) msg.readReceipts = [];

            if (type === "read") {
                const exists = msg.readReceipts.some(
                    (r) => r.userId._id === userId || (r.userId as any) === userId
                );

                if (!exists) {
                    msg.readReceipts.push({
                        userId: { _id: userId, profile: { name: "", avatarUrl: "" } } as any,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                }
            } else {
                msg.readReceipts = msg.readReceipts.filter(
                    (r) => r.userId._id !== userId && (r.userId as any) !== userId
                );
            }
        },

        updateRecallMessage(
            state,
            action: PayloadAction<{
                conversationId: string;
                messageId: string;
            }>
        ) {
            const { conversationId, messageId } = action.payload;
            const messages = state.messagesByConversation[conversationId];
            if (!messages) return;
            const msg = messages.find((m) => m._id === messageId);
            if (msg) msg.recalled = true;
        },

        updateMessageReaction(
            state,
            action: PayloadAction<{
                conversationId: string;
                messageId: string;
                reactions: any[];
            }>
        ) {
            const { conversationId, messageId, reactions } = action.payload;
            const messages = state.messagesByConversation[conversationId];
            if (!messages) return;
            const msg = messages.find((m) => m._id === messageId);
            if (msg) msg.reactions = reactions;
        },

        updateMessagePinned(
            state,
            action: PayloadAction<{
                conversationId: string;
                messageId: string;
                pinned: boolean;
            }>
        ) {
            const { conversationId, messageId, pinned } = action.payload;
            const messages = state.messagesByConversation[conversationId];
            if (!messages) return;
            const msg = messages.find((m) => m._id === messageId);
            if (msg) msg.pinned = pinned;
        },

        updateMessagesExpired(
            state,
            action: PayloadAction<{
                conversationId: string;
                messageIds: string[];
            }>
        ) {
            const { conversationId, messageIds } = action.payload;
            const messages = state.messagesByConversation[conversationId];
            if (!messages) return;
            messages.forEach((m) => {
                if (messageIds.includes(m._id)) m.expired = true;
            });
        },

        updatePoll(
            state,
            action: PayloadAction<{
                conversationId: string;
                pollId: string;
                updatedPoll: any;
            }>
        ) {
            const { conversationId, pollId, updatedPoll } = action.payload;
            const messages = state.messagesByConversation[conversationId];
            if (!messages) return;

            const msgIndex = messages.findIndex((m) => {
                if (!m.pollId) return false;
                const currentPollId = typeof m.pollId === "string" ? m.pollId : (m.pollId as any)._id;
                return String(currentPollId) === String(pollId);
            });

            if (msgIndex !== -1) {
                messages[msgIndex] = {
                    ...messages[msgIndex],
                    poll: {
                        ...messages[msgIndex].poll,
                        ...updatedPoll
                    } as any
                };
            }
        },

        addPollOption(
            state,
            action: PayloadAction<{
                conversationId: string;
                pollId: string;
                newOption: PollOptionType;
            }>
        ) {
            const { conversationId, pollId, newOption } = action.payload;
            const messages = state.messagesByConversation[conversationId];
            if (!messages) return;

            const msg = messages.find((m) => {
                if (!m.pollId) return false;
                const currentPollId = typeof m.pollId === "string" ? m.pollId : (m.pollId as any)._id;
                return String(currentPollId) === String(pollId);
            });

            if (msg && msg.poll) {
                if (!msg.poll.options) msg.poll.options = [];
                const exists = msg.poll.options.some(opt => String(opt._id) === String(newOption._id));
                if (!exists) {
                    msg.poll.options.push(newOption);
                }
            }
        },
    },
});

export const {
    setMessages,
    prependMessages,
    appendMessages,
    addMessage,
    updateReadReceipt,
    updateRecallMessage,
    updateMessageReaction,
    updateMessagePinned,
    updateMessagesExpired,
    updatePoll,
    addPollOption,
} = messageSlice.actions;

export default messageSlice.reducer;