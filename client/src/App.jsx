import { Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { FavouritesProvider } from "./context/FavouritesContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <FavouritesProvider>
          <ChatProvider>
            <Outlet />
          </ChatProvider>
        </FavouritesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
