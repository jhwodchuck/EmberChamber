const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    // Handle token expiry
    if (res.status === 401 && typeof window !== "undefined") {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry request with new token
        const newToken = localStorage.getItem("accessToken");
        const retryRes = await fetch(`${API_BASE}/api${path}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          },
        });
        if (retryRes.ok) {
          const retryBody = await retryRes.json();
          return retryBody.data ?? retryBody;
        }
      }
      // Clear auth state
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }
    throw new ApiError(res.status, body.error ?? "Request failed", body.code);
  }

  const data = await res.json();
  return data.data ?? data;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem("accessToken", data.data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// Auth API
export const authApi = {
  register: (data: {
    username: string;
    displayName: string;
    email?: string;
    password: string;
  }) =>
    fetchApi<{
      user: { id: string; username: string; displayName: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: {
    username: string;
    password: string;
    deviceName?: string;
  }) =>
    fetchApi<{
      user: { id: string; username: string; displayName: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () =>
    fetchApi<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () =>
    fetchApi<{
      id: string;
      username: string;
      displayName: string;
      email: string;
      avatarUrl?: string;
      bio?: string;
    }>("/auth/me"),
};

// Conversations API
export const conversationsApi = {
  list: () => fetchApi<unknown[]>("/conversations"),
  getOrCreateDm: (userId: string) =>
    fetchApi<{ id: string; isNew: boolean }>("/conversations/dm", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  createGroup: (data: {
    name: string;
    description?: string;
    isEncrypted?: boolean;
    memberIds?: string[];
  }) => fetchApi<{ id: string }>("/conversations/group", { method: "POST", body: JSON.stringify(data) }),
  get: (id: string) => fetchApi<unknown>(`/conversations/${id}`),
  getMessages: (id: string, before?: string) =>
    fetchApi<unknown[]>(
      `/conversations/${id}/messages${before ? `?before=${before}` : ""}`
    ),
  sendMessage: (
    id: string,
    data: { content?: string; type?: string; attachmentId?: string; replyToId?: string }
  ) =>
    fetchApi<unknown>(`/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  editMessage: (convId: string, msgId: string, content: string) =>
    fetchApi<unknown>(`/conversations/${convId}/messages/${msgId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),
  deleteMessage: (convId: string, msgId: string) =>
    fetchApi<unknown>(`/conversations/${convId}/messages/${msgId}`, {
      method: "DELETE",
    }),
  sendTyping: (convId: string, isTyping: boolean) =>
    fetchApi<unknown>(`/conversations/${convId}/typing`, {
      method: "POST",
      body: JSON.stringify({ isTyping }),
    }),
};

// Channels API
export const channelsApi = {
  list: (search?: string) =>
    fetchApi<unknown[]>(`/channels${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  myChannels: () => fetchApi<unknown[]>("/channels/me"),
  create: (data: {
    name: string;
    description?: string;
    visibility?: "public" | "private";
  }) => fetchApi<unknown>("/channels", { method: "POST", body: JSON.stringify(data) }),
  get: (id: string) => fetchApi<unknown>(`/channels/${id}`),
  join: (id: string) =>
    fetchApi<unknown>(`/channels/${id}/join`, { method: "POST" }),
  leave: (id: string) =>
    fetchApi<unknown>(`/channels/${id}/leave`, { method: "POST" }),
  getPosts: (id: string, before?: string) =>
    fetchApi<unknown[]>(
      `/channels/${id}/posts${before ? `?before=${before}` : ""}`
    ),
  createPost: (id: string, data: { content?: string; attachmentId?: string }) =>
    fetchApi<unknown>(`/channels/${id}/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deletePost: (channelId: string, postId: string) =>
    fetchApi<unknown>(`/channels/${channelId}/posts/${postId}`, {
      method: "DELETE",
    }),
};

// Users API
export const usersApi = {
  search: (q: string) => fetchApi<unknown[]>(`/users/search?q=${encodeURIComponent(q)}`),
  get: (id: string) => fetchApi<unknown>(`/users/${id}`),
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    fetchApi<unknown>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
  updatePrivacy: (data: {
    showLastSeen?: boolean;
    showReadReceipts?: boolean;
    allowDmsFrom?: "everyone" | "contacts" | "nobody";
    showOnlineStatus?: boolean;
    profileVisible?: boolean;
  }) =>
    fetchApi<unknown>("/users/me/privacy", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getPrivacy: () =>
    fetchApi<{
      showLastSeen: boolean;
      showReadReceipts: boolean;
      allowDmsFrom: "everyone" | "contacts" | "nobody";
      showOnlineStatus: boolean;
      profileVisible: boolean;
    }>("/users/me/privacy"),
  getSessions: () => fetchApi<unknown[]>("/users/me/sessions"),
  revokeSession: (sessionId: string) =>
    fetchApi<unknown>(`/users/me/sessions/${sessionId}`, { method: "DELETE" }),
  block: (userId: string, reason?: string) =>
    fetchApi<unknown>("/users/block", {
      method: "POST",
      body: JSON.stringify({ userId, reason }),
    }),
  unblock: (userId: string) =>
    fetchApi<unknown>(`/users/block/${userId}`, { method: "DELETE" }),
  report: (data: {
    reportedUserId?: string;
    reportedMessageId?: string;
    reportedChannelId?: string;
    reason: string;
    details?: string;
  }) =>
    fetchApi<unknown>("/users/report", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Invites API
export const invitesApi = {
  create: (data: {
    conversationId?: string;
    channelId?: string;
    expiresInHours?: number;
    maxUses?: number;
  }) =>
    fetchApi<{ id: string; code: string }>("/invites", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  preview: (code: string) => fetchApi<unknown>(`/invites/${code}`),
  accept: (code: string) =>
    fetchApi<{ conversationId?: string; channelId?: string }>(
      `/invites/${code}/accept`,
      { method: "POST" }
    ),
  revoke: (id: string) =>
    fetchApi<unknown>(`/invites/${id}`, { method: "DELETE" }),
};

// Search API
export const searchApi = {
  search: (q: string, type?: string) =>
    fetchApi<{
      messages?: unknown[];
      channels?: unknown[];
      users?: unknown[];
    }>(`/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`),
};

export const attachmentsApi = {
  getUrl: (id: string) =>
    fetchApi<{ url: string; fileName: string; mimeType: string }>(`/attachments/${id}/url`),
};

// File upload
export async function uploadFile(
  file: File,
  options?: { onProgress?: (progress: number) => void }
): Promise<{
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
}> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/attachments/upload`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      options?.onProgress?.(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener("load", () => {
      const responseText = xhr.responseText || "{}";
      const body = JSON.parse(responseText) as {
        data?: { id: string; url: string; file_name?: string; fileName?: string; mime_type?: string; mimeType?: string };
        error?: string;
        code?: string;
      };

      if (xhr.status >= 200 && xhr.status < 300 && body.data) {
        resolve({
          id: body.data.id,
          url: body.data.url,
          fileName: body.data.fileName ?? body.data.file_name ?? file.name,
          mimeType: body.data.mimeType ?? body.data.mime_type ?? file.type,
        });
        return;
      }

      if (xhr.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }

      reject(new ApiError(xhr.status, body.error ?? "Upload failed", body.code));
    });

    xhr.addEventListener("error", () => {
      reject(new ApiError(0, "Upload failed"));
    });

    xhr.send(formData);
  });
}
