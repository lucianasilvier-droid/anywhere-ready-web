import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, UserPlus, ShieldCheck, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { setUserFuncaoFn } from "@/lib/admin-fns";
import AdminField from "@/components/admin/AdminField";
import { iniciais, dataCurta } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/equipe")({
  head: () => ({ meta: [{ title: "Equipe e acessos — Painel" }] }),
  component: EquipePage,
});

const FUNCOES = [
  { value: "administrador", label: "Administrador" },
  { value: "operador", label: "Operador comercial" },
  { value: "atendente", label: "Atendente" },
  { value: "cliente", label: "Cliente" },
];

function EquipePage() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("user");
  const [convidando, setConvidando] = useState(false);
  const designar = useServerFn(setUserFuncaoFn);

  async function carregar() {
    setCarregando(true);
    try {
      const page = await base44.entities.User.list();
      setUsuarios(Array.isArray(page) ? page : page?.items || []);
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar a equipe.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const mFuncao = useMutation({
    mutationFn: (payload) => designar({ data: payload }),
    onSuccess: async () => {
      toast.success("Função atualizada.");
      await carregar();
    },
    onError: (e) => toast.error(e?.message || "Não foi possível atualizar a função."),
  });

  async function convidar(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Informe um e-mail válido.");
    setConvidando(true);
    try {
      const resultado = await base44.users.inviteUser(email, papel);
      if (resultado?.delivered) {
        toast.success("Convite enviado por e-mail.");
      } else {
        toast.warning("Usuário registrado, mas o convite não foi enviado. Configure SMTP_HOST, SMTP_PORT, SMTP_FROM e, se houver autenticação, SMTP_USER e SMTP_PASS nas variáveis do projeto.");
      }
      setEmail("");
      await carregar();
    } catch (err) {
      toast.error(err?.message || "Não foi possível enviar o convite.");
    } finally {
      setConvidando(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Acessos</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Equipe e permissões</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Convide pessoas, defina a função operacional e acompanhe quem acessa o painel.
        </p>
      </header>

      <form onSubmit={convidar} className="grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:grid-cols-[1.5fr_0.8fr_auto]">
        <AdminField label="E-mail do convidado" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
        <AdminField
          label="Papel na plataforma"
          value={papel}
          onChange={(e) => setPapel(e.target.value)}
          options={[{ value: "user", label: "Usuário" }, { value: "admin", label: "Administrador" }]}
        />
        <div className="flex items-end">
          <button
            type="submit"
            disabled={convidando}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
          >
            {convidando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Convidar
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-[11.5px] leading-relaxed text-amber-200/90">
        <p className="flex items-center gap-1.5 font-semibold text-amber-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Como as permissões funcionam
        </p>
        <p className="mt-1">
          O acesso completo ao painel (clientes, CRM, pedidos e configurações) exige papel{" "}
          <strong>Administrador</strong>. A função operacional organiza a equipe e identifica o
          responsável pelos contatos no CRM. Clientes acessam apenas a própria área, com os próprios
          dados e pedidos.
        </p>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando equipe...</div>
      ) : usuarios.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-2 text-sm text-white/55">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-2.5">Pessoa</th>
                <th className="px-4 py-2.5">Papel</th>
                <th className="px-4 py-2.5">Função</th>
                <th className="px-4 py-2.5">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {usuarios.map((u) => (
                <tr key={u.id} className="text-[12.5px]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-[10px] font-bold text-white/70">
                        {iniciais(u.full_name || u.email)}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{u.full_name || "Sem nome"}</p>
                        <p className="text-[10.5px] text-white/35">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${u.role === "admin" ? "border-primary/30 bg-primary/10 text-primary" : "border-white/15 bg-white/5 text-white/55"}`}>
                      {u.role === "admin" ? "Administrador" : "Usuário"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.funcao || "cliente"}
                      onChange={(e) => mFuncao.mutate({ email: u.email, funcao: e.target.value })}
                      className="rounded-lg border border-white/10 bg-[#0d1729] px-2 py-1 text-[11.5px] text-white"
                    >
                      {FUNCOES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-white/40">{dataCurta(u.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}