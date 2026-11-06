import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { ApiError, login, saveToken } from "../api";
import { prefersReducedMotion } from "../motion";
import { DanceCrowd } from "./DanceCrowd";
import { PasswordField } from "./PasswordField";

type Props = {
  onLogin: () => void;
};

// O carimbo de "acesso liberado" fica na tela por este tempo antes de abrir o dashboard
const STAMP_MS = 750;
// O Render grátis dorme: se o login demorar, avisamos em vez de parecer travado
const SLOW_NOTICE_MS = 4000;
// Passos da galera: cada tecla avança um (ver .crowd[data-move] no App.css)
const DANCE_MOVES = 6;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LoginForm({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [granted, setGranted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  const crowdRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef(0);

  useEffect(() => {
    // No celular, o foco automático abriria o teclado por cima da tela
    if (window.matchMedia("(hover: hover)").matches) emailRef.current?.focus();
  }, []);

  // Muda só um atributo: o CSS anima o passo, sem o React redesenhar os bonecos
  function setCrowdMove(move: string) {
    if (crowdRef.current && !prefersReducedMotion()) crowdRef.current.dataset.move = move;
  }

  function nextDanceMove() {
    moveRef.current = (moveRef.current % DANCE_MOVES) + 1;
    setCrowdMove(String(moveRef.current));
    // O pulinho anima a galera inteira de uma vez, o que é bem mais leve
    if (!prefersReducedMotion()) {
      crowdRef.current?.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-7px)" }, { transform: "translateY(0)" }],
        { duration: 190, easing: "ease-out" },
      );
    }
  }

  function shakePass() {
    if (prefersReducedMotion()) return;
    passRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-8px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 340, easing: "ease-out" },
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending || granted) return;

    setError(null);
    setSending(true);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_NOTICE_MS);

    try {
      const user = await login(email, password);
      saveToken(user.token);
      setGranted(true);
      setCrowdMove("cheer");
      if (!prefersReducedMotion()) await wait(STAMP_MS);
      onLogin();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Email ou senha inválidos"
          : "Não foi possível entrar agora. Tente de novo.",
      );
      shakePass();
      setCrowdMove("slump");
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setSending(false);
    }
  }

  const holder = email.split("@")[0].trim();

  return (
    <div className="auth">
      <div className="auth__lights" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className="auth__intro">
        <p className="auth__brand">team hub</p>
        <h1>
          Tudo pronto
          <br />
          antes do <em>show</em> começar.
        </h1>
        <p className="auth__lead">
          Tarefas, prazos e o time inteiro no mesmo lugar, do primeiro ajuste ao último acorde.
        </p>
      </section>

      <div className="auth__pass-wrap">
        <span className="auth__lanyard" aria-hidden="true" />
        <div ref={passRef} className="pass">
          <span className="pass__slot" aria-hidden="true" />

          <header className="pass__head">
            <span className="pass__tag">Credencial</span>
            <span className="pass__tag pass__tag--access">Backstage</span>
          </header>

          <div className="pass__holder" aria-hidden="true">
            <span className="pass__label">Portador</span>
            <span className={`pass__name${holder ? "" : " is-empty"}`}>{holder || "Seu nome aqui"}</span>
          </div>

          <form className="pass__form" onSubmit={handleSubmit}>
            <h2 className="sr-only">Entrar</h2>

            <label className="pass-field">
              <span className="pass-field__label">Email</span>
              <input
                ref={emailRef}
                className="pass-field__input"
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  nextDanceMove();
                }}
                required
              />
            </label>

            <PasswordField
              label="Senha"
              autoComplete="current-password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                nextDanceMove();
              }}
            />

            {error && (
              <p className="pass__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="pass__submit" disabled={sending || granted}>
              {sending && !granted ? (
                <>
                  <LoaderCircle className="pass__spinner" size={18} aria-hidden="true" />
                  Conferindo credencial
                </>
              ) : (
                <>
                  Entrar nos bastidores
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>

            <p className="pass__notice" role="status">
              {slow && !granted ? "O servidor está acordando. Pode levar alguns segundos." : ""}
            </p>
          </form>

          {granted && (
            <div className="pass__stamp" role="status">
              <span>Acesso liberado</span>
            </div>
          )}
        </div>
      </div>

      <DanceCrowd crowdRef={crowdRef} />
    </div>
  );
}
