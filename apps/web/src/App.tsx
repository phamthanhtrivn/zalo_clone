import { Provider } from "react-redux";
import { store } from "./store";
import { AppRouter } from "./routes";
import { ToastContainer } from "react-toastify";

import "./App.css";

function App() {
  return (
    <Provider store={store}>
      <AppRouter />
      <ToastContainer />
    </Provider>
  );
}

export default App;
