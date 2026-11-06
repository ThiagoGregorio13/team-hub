import { useState, type FormEvent } from "react";
import {login, saveToken} from "../api"

type Props = {
  onLogin: () => void;
}

export function LoginForm({onLogin}: Props) {

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState<string | null>(null);
const [sending, setSending] = useState(false);

async function handleSubmit(event: FormEvent){
  event.preventDefault();
  setError(null)
  setSending(true)


try{
  const user = await login(email, password)
  saveToken(user.token)
  onLogin();
}

catch{
  setError("Email ou senha inválidos")
}

finally{
  setSending(false)
}

}

return (
    <form className="login" onSubmit={handleSubmit}>
      <h1>Entrar</h1>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label>
        Senha
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={sending}>
        {sending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );

}


