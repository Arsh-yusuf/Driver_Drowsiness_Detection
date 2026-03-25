const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export const registerUser = async (data: { email: string; password: string }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error("Registration failed");
    return res.json();
};

export const loginUser = async (data: { email: string; password: string }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error("Login failed");
    return res.json();
};

export const getEvents = async (token: string) => {
    const res = await fetch(`${API_BASE}/events/`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
};

export const getAISuggestions = async (token: string) => {
    const res = await fetch(`${API_BASE}/events/suggestions`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch AI suggestions");
    return res.json();
};

export const getSessions = async (token: string) => {
    const res = await fetch(`${API_BASE}/sessions/`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch sessions");
    return res.json();
};

export const startSession = async (token: string) => {
    const res = await fetch(`${API_BASE}/sessions/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to start session");
    return res.json();
};

export const endSession = async (token: string, sessionId: string) => {
    const res = await fetch(`${API_BASE}/sessions/end/${sessionId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to end session");
    return res.json();
};

export const sendEvent = async (token: string, eventData: any) => {
    const res = await fetch(`${API_BASE}/events/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error("Failed to send event");
    return res.json();
};
