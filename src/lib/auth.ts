import { supabase } from "./supabase";

let sessionPromise: Promise<void> | null = null;

/**
 * ログイン画面を表示せず、ブラウザごとの匿名利用者を準備する。
 * 同時に複数画面から呼ばれても匿名ユーザーを重複作成しない。
 */
export function ensureAnonymousSession(): Promise<void> {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (session) return;

    const { error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) throw signInError;
  })();

  return sessionPromise.catch((error) => {
    sessionPromise = null;
    throw error;
  });
}
