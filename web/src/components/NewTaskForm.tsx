import { useEffect, useState, type FormEvent, useRef } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { createTask, displayName, getMembers, type Member } from "../api";

 type NewTaskFormProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
 }


export function NewTaskForm({open, onClose, onCreated}: NewTaskFormProps){
  const [title, setTitle] = useState("");
  const [member_id, setMember_Id] = useState("");
  const [due_date, setDue_Date] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDialogElement>(null);


  useEffect(() => {
  getMembers().then(setMembers)
}, [])

 useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(event: FormEvent) {
event.preventDefault();
setError(null);
try {
  await createTask(title, Number(member_id), due_date)
  onCreated()
}
catch{
  setError("Não foi possível criar a tarefa")
}
  }
  return (
    <dialog
      ref={ref}
      className="drawer"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-labelledby="new-task-title"
    >
      <form className="drawer__body" onSubmit={handleSubmit}>
        <button type="button" className="icon-button drawer__close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        <p className="drawer__id">Adicionar ao quadro</p>
        <h2 id="new-task-title" className="drawer__title">
          Nova tarefa
        </h2>

        {/* O <label> em volta liga o texto ao campo: clicar em "Título" já foca o input */}
        <label className="field">
          <span className="field__label">Título</span>
          <input
            className="field__control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Revisar o README"
          />
        </label>

        <label className="field">
          <span className="field__label">Responsável</span>
          <span className="field__select">
            <select className="field__control" value={member_id} onChange={(e) => setMember_Id(e.target.value)}>
              <option value="">Escolha um responsável</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {displayName(m.name)}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>

        <label className="field">
          <span className="field__label">Prazo</span>
          <input
            className="field__control"
            type="date"
            value={due_date}
            onChange={(e) => setDue_Date(e.target.value)}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="button button--primary">
            <Plus size={16} aria-hidden="true" />
            Criar tarefa
          </button>
        </div>
      </form>

              </dialog>


  )

  

}