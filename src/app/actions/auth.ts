"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

export type AuthFormState = { error: string } | undefined;

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  redirect("/");
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();

  if (!username) {
    return { error: "Escolha um nome de usuário." };
  }
  if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
    return {
      error:
        "O nome de usuário aceita de 3 a 30 caracteres, entre letras, números, ponto e underline.",
    };
  }
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const supabase = await createClient();
  // O `username` vai nos metadados e o gatilho `handle_new_user` preenche o
  // perfil com ele — assim o nome exibido nunca nasce como e-mail.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    // O `username` é unique: a violação sobe do gatilho como erro do signUp.
    if (/duplicate key|already exists|unique/i.test(error.message)) {
      return { error: "Esse nome de usuário já está em uso." };
    }
    return { error: error.message };
  }

  // Se a confirmação de e-mail estiver ativa no projeto Supabase, não há
  // sessão ainda — o usuário precisa confirmar antes de entrar.
  if (!data.session) {
    return {
      error:
        "Conta criada! Confirme seu e-mail (verifique a caixa de entrada) antes de entrar.",
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
  if (error) return { error: "Não foi possível enviar o e-mail. Tente novamente." };
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
