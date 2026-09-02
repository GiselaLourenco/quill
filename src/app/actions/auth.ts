"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";

export type AuthFormState = { error?: string; sucesso?: string } | undefined;

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

// Traduz os erros do GoTrue pro português. O `code` é estável (a `message` vem
// em inglês e muda entre versões), então a decisão é sempre pelo código.
function mensagemDeAuth(codigo: string | undefined, status: number | undefined) {
  switch (codigo) {
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.";
    case "weak_password":
      return "Senha muito fraca. Use pelo menos 8 caracteres, misturando letras e números.";
    case "email_address_invalid":
    case "validation_failed":
      return "Esse e-mail não parece válido. Confira e tente de novo.";
    case "email_address_not_authorized":
      // Sem SMTP próprio, o servidor de e-mail da Supabase só entrega para
      // endereços de quem é membro da organização do projeto.
      return "Ainda não conseguimos enviar e-mail para esse endereço. Avise a gente pra liberar.";
    case "over_email_send_rate_limit":
      // A cota é por projeto e por hora, somando cadastro, recuperação e
      // troca de e-mail — por isso o limite estoura mesmo no primeiro envio
      // de quem está tentando agora.
      return "Já enviamos muitos e-mails na última hora. Tente de novo daqui a pouco.";
    case "over_request_rate_limit":
      return "Muitas tentativas seguidas. Espere um pouco e tente de novo.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "O cadastro por e-mail está desativado no momento.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar — o link está na sua caixa de entrada.";
    case "invalid_credentials":
      return "E-mail, nome de usuário ou senha incorretos.";
    default:
      if (status === 0) {
        return "Não conseguimos falar com o servidor. Cheque sua conexão e tente de novo.";
      }
      return null;
  }
}

// Descobre o e-mail de um username. Precisa da service_role: `profiles` só é
// legível por quem já está autenticado, e quem está no login ainda não está.
async function emailDoUsername(username: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: perfil } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!perfil) return null;

  const { data } = await admin.auth.admin.getUserById(perfil.id);
  return data.user?.email ?? null;
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const identificador = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identificador) {
    return { error: "Digite seu e-mail ou nome de usuário." };
  }
  if (!password) {
    return { error: "Digite sua senha." };
  }

  // Sem "@" tratamos como nome de usuário e resolvemos pro e-mail da conta —
  // o Supabase só autentica por e-mail.
  let email = identificador;
  if (!identificador.includes("@")) {
    const username = identificador.toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return { error: "E-mail, nome de usuário ou senha incorretos." };
    }
    const encontrado = await emailDoUsername(username);
    if (!encontrado) {
      return { error: "E-mail, nome de usuário ou senha incorretos." };
    }
    email = encontrado;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[login]", error.name, error.status, error.code, error.message);
    return {
      error:
        mensagemDeAuth(error.code, error.status) ??
        "E-mail, nome de usuário ou senha incorretos.",
    };
  }

  redirect("/");
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();

  if (!username) {
    return { error: "Escolha um nome de usuário." };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      error:
        "O nome de usuário aceita de 3 a 30 caracteres, entre letras, números, ponto e underline.",
    };
  }
  if (!email) {
    return { error: "Digite seu e-mail." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Esse e-mail não parece válido. Confira e tente de novo." };
  }
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  // Username é `unique` em `profiles` e quem preenche é o gatilho
  // `handle_new_user`. Quando ele estoura, o GoTrue devolve 500 e o
  // supabase-js perde o corpo da resposta (a mensagem vira "{}"), então a
  // checagem tem que vir ANTES do signUp pra dar uma explicação de verdade.
  const admin = createAdminClient();
  if (admin) {
    const { data: existente, error: erroConsulta } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (erroConsulta) {
      console.error("[signup] checagem de username", erroConsulta.message);
    } else if (existente) {
      return { error: "Esse nome de usuário já está em uso. Escolha outro." };
    }
  }

  const supabase = await createClient();
  // O `username` vai nos metadados e o gatilho `handle_new_user` preenche o
  // perfil com ele — assim o nome exibido nunca nasce como e-mail.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      // Sem isso o link de confirmação sai com o Site URL do projeto — que em
      // algum momento vai estar apontando pra localhost e não abre no celular.
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    console.error("[signup]", error.name, error.status, error.code, error.message);
    const traduzido = mensagemDeAuth(error.code, error.status);
    if (traduzido) return { error: traduzido };
    // 500 sem código: ou alguém pegou o username entre a checagem e o insert,
    // ou o gatilho/envio de e-mail falhou. O corpo do erro não chega até aqui.
    if (error.status === 500) {
      return {
        error:
          "Não foi possível criar a conta. O nome de usuário pode ter acabado de ser registrado por outra pessoa — tente outro.",
      };
    }
    return { error: "Não foi possível criar a conta. Tente de novo em instantes." };
  }

  // O Supabase não erra quando o e-mail já existe (é proposital, pra não
  // revelar quem tem conta): devolve um usuário sem `identities`.
  if (data.user && data.user.identities?.length === 0) {
    return {
      error: "Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.",
    };
  }

  // Confirmação de e-mail ativa no projeto: a conta foi criada, mas ainda não
  // há sessão. Isso é sucesso, não erro.
  if (!data.session) {
    return {
      sucesso:
        "Conta criada! Confirme seu e-mail (verifique a caixa de entrada, e o spam) antes de entrar.",
    };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  // O link do e-mail cai em /auth/callback, que troca o `code` por sessão e
  // só então manda pra tela de escolher a senha nova.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
  });
  if (error) {
    console.error("[reset]", error.name, error.status, error.code, error.message);
    return {
      error:
        mensagemDeAuth(error.code, error.status) ??
        "Não foi possível enviar o e-mail. Tente novamente.",
    };
  }
  return { error: "enviado" }; // sentinel para o client saber que deu certo
}

export type UpdatePasswordState =
  | { error: string; campo?: "senha" | "confirmar" }
  | { ok: true }
  | undefined;

// Roda com a sessão de recuperação criada em /auth/callback — por isso não
// pede a senha antiga.
export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const senha = String(formData.get("password") ?? "");
  const confirmacao = String(formData.get("password-confirm") ?? "");

  if (senha.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres.", campo: "senha" };
  }
  if (senha !== confirmacao) {
    return { error: "As duas senhas não conferem.", campo: "confirmar" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    // Sessão de recuperação vencida entre abrir o link e enviar o formulário.
    if (/session|jwt|expired/i.test(error.message)) return { error: "expirado" };
    return { error: error.message };
  }

  // Encerra a sessão de recuperação: quem tiver o link do e-mail em mãos não
  // continua dentro da conta — pra entrar, precisa saber a senha nova.
  await supabase.auth.signOut();
  return { ok: true };
}

// Exclusão definitiva da conta. O trabalho pesado (apagar o usuário do Auth)
// só é possível com a service_role, que fica na Edge Function `delete-account`
// — aqui só repassamos o token da sessão de quem pediu.
export async function deleteAccount(): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) return { error: "Sessão expirada. Entre de novo e tente outra vez." };

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return { error: "Configuração do Supabase ausente." };

  const res = await fetch(`${baseUrl}/functions/v1/delete-account`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const detalhe = await res.json().catch(() => null);
    return { error: detalhe?.error ?? "Não foi possível excluir a conta." };
  }

  await supabase.auth.signOut();
  redirect("/login");
}

export type TrocaSenhaState =
  | { error: string; campo?: "atual" | "nova" | "confirmar" }
  | { ok: true }
  | undefined;

/**
 * Troca de senha com a senha atual, sem passar por e-mail.
 *
 * O Supabase não tem "trocar senha conferindo a antiga": `updateUser` confia
 * na sessão e aceita qualquer senha nova. Então a conferência é feita
 * entrando de novo com a senha atual — se o login passa, a pessoa é mesmo
 * quem diz ser. Sem isso, um celular esquecido destravado trocaria a senha da
 * conta em dois toques.
 */
export async function trocarSenha(
  _prevState: TrocaSenhaState,
  formData: FormData,
): Promise<TrocaSenhaState> {
  const atual = String(formData.get("senha-atual") ?? "");
  const nova = String(formData.get("senha-nova") ?? "");
  const confirmacao = String(formData.get("senha-confirmar") ?? "");

  if (!atual) return { error: "Digite sua senha atual.", campo: "atual" };
  if (nova.length < 8) {
    return { error: "A senha nova precisa ter pelo menos 8 caracteres.", campo: "nova" };
  }
  if (nova !== confirmacao) {
    return { error: "As duas senhas não conferem.", campo: "confirmar" };
  }
  if (nova === atual) {
    return { error: "A senha nova é igual à atual.", campo: "nova" };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims?.email as string | undefined;
  if (!email) return { error: "Sessão expirada. Entre de novo e tente outra vez." };

  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email,
    password: atual,
  });
  if (erroLogin) {
    console.error("[trocarSenha] conferência", erroLogin.code, erroLogin.status);
    // Rate limit do Supabase precisa aparecer como tal — senão parece que a
    // senha certa foi recusada.
    const traduzido = mensagemDeAuth(erroLogin.code, erroLogin.status);
    if (erroLogin.code === "over_request_rate_limit" && traduzido) {
      return { error: traduzido };
    }
    return { error: "Senha atual incorreta.", campo: "atual" };
  }

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    console.error("[trocarSenha]", error.code, error.status, error.message);
    return {
      error: mensagemDeAuth(error.code, error.status) ?? "Não foi possível trocar a senha.",
    };
  }

  return { ok: true };
}
