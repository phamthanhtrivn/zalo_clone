import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice";
import userReducer from "./auth/userInfoSlice";
import diaryReducer from "./slices/diarySlice";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import conversationReducer from "./slices/conversationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    userInfo: userReducer,
    conversation: conversationReducer,
    diary: diaryReducer,
  },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
