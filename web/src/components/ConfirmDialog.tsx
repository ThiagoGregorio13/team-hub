import {useEffect, useRef} from "react"

export type ConfirmDialogProps = {
onConfirm:() => void;
onCancel: () => void;
open:boolean;
message: string;
}

export function DialogCancel({open,message, onCancel, onConfirm}: ConfirmDialogProps){
   const ref = useRef<HTMLDialogElement>(null);  
    useEffect(() => {
      const dialog = ref.current;
      if (!dialog) return;
      if (open && !dialog.open) dialog.showModal();
      if (!open && dialog.open) dialog.close();
    }, [open]);
return (
  <dialog ref={ref} className="confirm" onClose={onCancel}>

<p className="confirm__message">{message}</p>

    <div className="confirm__actions">

<button className="button button--outline" onClick={onCancel}>
  Cancelar 
           </button>
<button className="button button--danger" onClick={onConfirm}>
  Prosseguir 
           </button>


      </div>
  </dialog>
  
)
}
