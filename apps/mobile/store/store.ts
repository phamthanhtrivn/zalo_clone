import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice";
import userReducer from "./auth/userInfoSlice";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

<<<<<<< HEAD
export const store = configureStore({
  reducer: {
    auth: authReducer,
    userInfo : userReducer
=======
import conversationReducer from "./slices/conversationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    userInfo : userReducer,
    conversation: conversationReducer,
>>>>>>> ab3cba3247be0ab8bd4e07f815c36f20957c22f6
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
