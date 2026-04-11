import { Provider } from "react-redux";
import { store } from "./store";
import { AppRouter } from "./routes";
import "./App.css";
import { ToastContainer } from "react-toastify";
import { SocketProvider } from "./contexts/SocketContext";

function App() {
  return (
    <Provider store={store}>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
      <ToastContainer />
    </Provider>
  );
}

export default App;
