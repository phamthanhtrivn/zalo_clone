import { Provider } from "react-redux";
import { store, useAppDispatch } from "./store";
import { AppRouter } from "./routes";
import "./App.css";
import { ToastContainer } from "react-toastify";
import { SocketProvider } from "./contexts/SocketContext";
import { CallProvider } from "./contexts/VideoCallContext";
import IncomingCall from "./components/video-call/IncomingCall";
import OutgoingCall from "./components/video-call/OutgoingCall";
import VideoCallOverlay from "./components/video-call/VideoCallOverlay";
import { restoreSession } from "./store/auth/authThunk";
import { useEffect, useState } from "react";

const Bootstrap = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const restoreAuth = async () => {
      await dispatch(restoreSession());

      setIsReady(true);
    };
    restoreAuth();
  }, [dispatch]);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        Đang tải trang...
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <Provider store={store}>
      <Bootstrap>
        <SocketProvider>
          <CallProvider>
            <AppRouter />
            <IncomingCall />
            <OutgoingCall />
            <VideoCallOverlay />
          </CallProvider>
        </SocketProvider>
        <ToastContainer />
      </Bootstrap>
    </Provider>
  );
}

export default App;
