import { useEffect, useRef, useState, type FormEvent } from "react";
import { BadgeCheck, LoaderCircle, X } from "lucide-react";
import { ApiError, register } from "../api";
import { PasswordField } from "./PasswordField";

type RegisterDialogProps = {
  onClose: () => void;
};

const MIN_PASSWORD = 8;
const STRENGTH_LABEL = ["Muito curta", "Fraca", "Razoável", "Boa", "Forte"];

// Conta só comprimento e variedade: é uma ajuda visual, quem valida é a API
function passwordStrength(password: string): number {
  if (password.length < MIN_PASSWORD) return 0;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) return "Este email já tem uma credencial.";
  if (err instanceof ApiError && err.status === 403) return "Só administradores podem criar credenciais.";
  return "Não foi possível criar a credencial. Tente de novo.";
}

// O cadastro é só para admins: a API confere o perfil, este botão só esconde a opção dos outros
export function RegisterDialog({ onClose }: RegisterDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;

    setError(null);
    setSending(true);
    try {
      const user = await register(email, password);
      setCreated(user.email);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const strength = passwordStrength(password);

  return (
    <dialog ref={dialogRef} className="credential" onClose={onClose} aria-labelledby="credential-title">
      <button type="button" className="icon-button credential__close" onClick={onClose} aria-label="Fechar">
        <X size={18} aria-hidden="true" />
      </button>

      {created ? (
        <div className="credential__done" role="status">
          <BadgeCheck size={44} aria-hidden="true" />
          <h2 id="credential-title">Credencial criada</h2>
          <p>
            <strong>{created}</strong> já pode entrar como membro do time. Envie a senha por um canal
            seguro.
          </p>
          <div className="credential__actions">
            <button type="button" className="button button--outline" onClick={() => setCreated(null)}>
              Criar outra
            </button>
            <button type="button" className="button button--primary" onClick={onClose}>
              Concluir
            </button>
          </div>
        </div>
      ) : (
        <form className="credential__form" onSubmit={handleSubmit}>
          <span className="pass__tag">Admin</span>
          <h2 id="credential-title">Nova credencial</h2>
          <p className="credential__lead">A pessoa entra como membro do time.</p>

          <label className="pass-field">
            <span className="pass-field__label">Email</span>
            <input
              className="pass-field__input"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <PasswordField
            label="Senha inicial"
            autoComplete="new-password"
            value={password}
            minLength={MIN_PASSWORD}
            onChange={setPassword}
          />

          <div className="strength" data-score={strength}>
            <div className="strength__bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className="strength__label" aria-live="polite">
              {password ? STRENGTH_LABEL[strength] : `Pelo menos ${MIN_PASSWORD} caracteres`}
            </p>
          </div>

          {error && (
            <p className="pass__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="pass__submit" disabled={sending}>
            {sending && <LoaderCircle className="pass__spinner" size={18} aria-hidden="true" />}
            {sending ? "Criando credencial" : "Criar credencial"}
          </button>
        </form>
      )}
    </dialog>
  );
}
