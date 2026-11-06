import { useState } from "react";
import App from "../App";
import { getToken } from "../api";
import { LoginForm } from "./LoginForm";

export function AuthGate() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()));

  if (!loggedIn) {
    return <LoginForm onLogin={() => setLoggedIn(true)} />;
  }
  return <App/>;
}
