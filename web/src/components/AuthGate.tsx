import { useState } from "react";
import App from "../App";
import { getToken } from "../api";
import { prefersReducedMotion } from "../motion";
import { LoginForm } from "./LoginForm";
import { Vignette } from "./Vignette";

export function AuthGate() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()));
  // Só depois de um login novo: recarregar a página não repete a vinheta
  const [showVignette, setShowVignette] = useState(false);

  function handleLogin() {
    setShowVignette(!prefersReducedMotion());
    setLoggedIn(true);
  }

  if (!loggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <>
      <App />
      {showVignette && <Vignette onDone={() => setShowVignette(false)} />}
    </>
  );
}
