import { Provider } from "react-redux";
import { store } from "./store";
import { AppRouter } from "./routes";
import "./App.css";
import { ToastContainer } from "react-toastify";
import { SocketProvider } from "./contexts/SocketContext";
import { CallProvider } from "./contexts/VideoCallContext";
import IncomingCall from "./components/video-call/IncomingCall";
import OutgoingCall from "./components/video-call/OutgoingCall";
import VideoCallOverlay from "./components/video-call/VideoCallOverlay";

function App() {
  return (
    <Provider store={store}>
      <SocketProvider>
        <CallProvider>
          <AppRouter />
          <IncomingCall />
          <OutgoingCall />
          <VideoCallOverlay />
        </CallProvider>
      </SocketProvider>
      <ToastContainer />
    </Provider>
  );
}

export default App;
