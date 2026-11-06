import { useState, type KeyboardEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  minLength?: number;
  onChange: (value: string) => void;
};

export function PasswordField({ label, autoComplete, value, minLength, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function checkCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  return (
    <div className="pass-field">
      <label className="pass-field__control">
        <span className="pass-field__label">{label}</span>
        <input
          className="pass-field__input pass-field__input--password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          onKeyUp={checkCapsLock}
          onBlur={() => setCapsLock(false)}
          required
        />
      </label>
      <button
        type="button"
        className="pass-field__toggle"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
      {capsLock && <p className="pass-field__caps">Caps Lock ligado</p>}
    </div>
  );
}
