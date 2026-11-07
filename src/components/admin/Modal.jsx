import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Modal({ open, onOpenChange, title, children, wide }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto border-white/10 bg-[#0b1424] text-white ${
          wide ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-base font-bold text-white">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}