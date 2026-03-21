import { Provider } from "react-redux";
import { store } from "./store";
import { AppRouter } from "./routes";
import "./App.css";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <Provider store={store}>
      <AppRouter />
      <ToastContainer />
    </Provider>
  );
}

export default App;
