// Merkezi API istemcisi.
//
// Amaç: (1) backend adresini tek yerden yönetmek (önceden 5 farklı dosyada
// "http://localhost:8080" hardcoded haldeydi), (2) her istekte oturum açan
// kullanıcının id'sini "X-User-Id" header'ı olarak otomatik eklemek.
//
// NOT: Sistemde henüz gerçek bir token/oturum mekanizması (JWT vb.) yok;
// backend bu header'ı okuyup kullanıcının rolünü/birimini KENDİ veritabanından
// doğruluyor (bkz. FormController#resolveCurrentUser). Bu, ileride gerçek bir
// JWT akışına geçilene kadar kullanılan geçici ama sunucu tarafında da
// doğrulanan bir kimliklendirme yöntemidir.

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080';

let currentUserId: number | null = null;

export function setCurrentUserId(id: number | null) {
  currentUserId = id;
}

export function getCurrentUserId(): number | null {
  return currentUserId;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (currentUserId != null) {
    headers.set('X-User-Id', String(currentUserId));
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

// JSON bekleyen istekler için kısayol: hata durumunda backend'in döndürdüğü
// metni (varsa) mesaj olarak fırlatır, böylece çağıran taraf try/catch +
// Snackbar ile kullanıcıya anlamlı bir hata gösterebilir.
export async function apiFetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `İstek başarısız oldu (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}
