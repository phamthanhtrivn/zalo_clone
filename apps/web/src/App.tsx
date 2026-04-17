import { Provider } from "react-redux";
import { store, useAppDispatch, useAppSelector } from "./store";
import { AppRouter } from "./routes";
import "./App.css";
import { ToastContainer } from "react-toastify";
import { SocketProvider } from "./contexts/SocketContext";
import { useEffect, useState } from "react";
import { restoreSession } from "./store/auth/authThunk";

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
          <AppRouter />
        </SocketProvider>
        <ToastContainer />
      </Bootstrap>
    </Provider>
  );
}

export default App;
