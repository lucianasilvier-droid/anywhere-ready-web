import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { submitServiceRequest } from "@/lib/server-fns";

export default function ServiceRequestForm({ servico = "nao_sei", titulo, descricao }) {
  const submit = useServerFn(submitServiceRequest);
  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    email: "",
    telefone: "",
    cidade: "",
    mensagem: "",
  });
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload) => submit({ data: payload }),
    onSuccess: () => {
      setEnviado(true);
      toast.success("Solicitação registrada! Nossa equipe vai entrar em contato.");
    },
    onError: (e) => {
      setErro(e?.message || "Não foi possível enviar agora. Tente novamente.");
      toast.error("Não foi possível enviar sua solicitação.");
    },
  });

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  function handleSubmit(event) {
    event.preventDefault();
    setErro("");
    if (form.nome.trim().length < 2) return setErro("Informe seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErro("Informe um e-mail válido.");
    if (form.telefone.replace(/\D/g, "").length < 10) return setErro("Informe um WhatsApp com DDD.");
    mutation.mutate({
      nome: form.nome,
      empresa: form.empresa,
      email: form.email,
      telefone: form.telefone,
      cidade: form.cidade,
      mensagem: form.mensagem,
      servico,
    });
  }

  if (enviado) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h3 className="mt-4 font-heading text-lg font-bold text-white">Solicitação enviada</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/60">
          Registramos seu contato no nosso sistema. Um consultor vai falar com você pelo WhatsApp
          informado.
        </p>
        <button
          onClick={() => {
            setEnviado(false);
            setForm({ nome: "", empresa: "", email: "", telefone: "", cidade: "", mensagem: "" });
          }}
          className="mt-5 text-xs font-semibold text-primary hover:underline"
        >
          Enviar outra solicitação
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6">
      <h3 className="font-heading text-lg font-bold text-white">{titulo || "Solicite seu atendimento"}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
        {descricao || "Preencha os dados e nossa equipe retorna com os próximos passos."}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Seu nome *" value={form.nome} onChange={set("nome")} placeholder="Nome completo" />
        <Field label="Empresa" value={form.empresa} onChange={set("empresa")} placeholder="Nome do negócio" />
        <Field label="E-mail *" type="email" value={form.email} onChange={set("email")} placeholder="voce@empresa.com" />
        <Field label="WhatsApp *" value={form.telefone} onChange={set("telefone")} placeholder="(11) 90000-0000" />
        <div className="sm:col-span-2">
          <Field label="Cidade" value={form.cidade} onChange={set("cidade")} placeholder="Cidade / bairro" />
        </div>
      </div>

      <label className="mt-3 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Como podemos ajudar?
        </span>
        <textarea
          value={form.mensagem}
          onChange={set("mensagem")}
          rows={3}
          placeholder="Conte um pouco sobre o seu negócio"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none"
        />
      </label>

      {erro && <p className="mt-3 text-xs font-medium text-red-400">{erro}</p>}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-5 py-3 text-sm font-bold text-[#0a1128] transition-opacity disabled:opacity-60"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {mutation.isPending ? "Enviando..." : "Enviar solicitação"}
      </button>
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        Ao enviar, você autoriza o contato sobre este serviço. Seus dados são usados apenas para
        atendimento e podem ser corrigidos ou excluídos a qualquer momento.
      </p>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none"
      />
    </label>
  );
}