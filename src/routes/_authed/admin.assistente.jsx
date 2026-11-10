import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, Loader2, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { chatgptAdminFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_authed/admin/assistente")({
  head: () => ({ meta: [{ title: "Assistente ChatGPT — Painel" }] }),
  component: AssistenteChatGPTPage,
});

function AssistenteChatGPTPage() {
  const enviar = useServerFn(chatgptAdminFn);
  const [mensagem, setMensagem] = useState("");
  const [historico, setHistorico] = useState([]);

  const mutation = useMutation({
    mutationFn: ({ texto, conversa }) =>
      enviar({ data: { mensagem: texto, historico: conversa } }),
    onSuccess: (resultado, variaveis) => {
      setHistorico((atual) => [
        ...atual,
        { role: "user", content: variaveis.texto },
        { role: "assistant", content: resultado.resposta },
      ]);
    },
    onError: (erro) => toast.error(erro?.message || "Não foi possível consultar o ChatGPT."),
  });

  function enviarMensagem(event) {
    event.preventDefault();
    const texto = mensagem.trim();
    if (!texto || mutation.isPending) return;
    mutation.mutate({ texto, conversa: historico });
    setMensagem("");
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Inteligência artificial</p>
        <h1 className="mt-1.5 flex items-center gap-2 font-heading text-2xl font-extrabold text-white">
          <Bot className="h-6 w-6 text-primary" /> Assistente ChatGPT
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/45">
          Tire dúvidas sobre o funcionamento do sistema, CRM, representantes, sites de demonstração e integrações.
        </p>
      </header>

      <section className="flex min-h-[420px] flex-col rounded-2xl border border-white/[0.08] bg-white/[0.025]">
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
          <div>
            <p className="text-[12.5px] font-bold text-white">ChatGPT · Assistente administrativo</p>
            <p className="text-[10.5px] text-white/35">As conversas são enviadas à API OpenAI usando a chave privada cadastrada.</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 p-4">
          {historico.length === 0 ? (
            <div className="mx-auto max-w-lg py-14 text-center">
              <Bot className="mx-auto h-10 w-10 text-primary/70" />
              <p className="mt-3 text-sm font-semibold text-white">Como posso ajudar na administração?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/40">
                Pergunte, por exemplo, como funciona o funil, como configurar uma integração ou como interpretar uma mensagem de erro.
              </p>
            </div>
          ) : historico.map((item, index) => (
            <div key={index} className={`flex gap-2.5 ${item.role === "user" ? "justify-end" : "justify-start"}`}>
              {item.role === "assistant" && <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Bot className="h-4 w-4" /></span>}
              <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-3 text-[12.5px] leading-relaxed ${item.role === "user" ? "bg-primary/15 text-white" : "border border-white/[0.08] bg-black/20 text-white/80"}`}>
                {item.content}
              </div>
              {item.role === "user" && <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-white/60"><UserRound className="h-4 w-4" /></span>}
            </div>
          ))}
          {mutation.isPending && (
            <div className="flex items-center gap-2 text-[12px] text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" /> ChatGPT está respondendo...
            </div>
          )}
        </div>

        <form onSubmit={enviarMensagem} className="border-t border-white/[0.07] p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={mensagem}
              onChange={(event) => setMensagem(event.target.value)}
              rows={2}
              maxLength={3000}
              placeholder="Escreva sua pergunta para o ChatGPT..."
              className="min-h-[48px] flex-1 resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-[12.5px] text-white placeholder:text-white/30 focus:border-primary/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!mensagem.trim() || mutation.isPending}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-[12px] font-bold text-primary-foreground disabled:opacity-40"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/30">
            O assistente orienta e analisa. Ele não altera o código, não publica e não executa ações externas por conta própria.
          </p>
        </form>
      </section>
    </div>
  );
}
