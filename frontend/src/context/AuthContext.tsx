import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import {
    loginUser,
    registerUser,
    logoutUser,
} from "../api/auth.api";

import type {
    AuthUser,
    LoginRequest,
    RegisterRequest,
    AuthResponse,
} from "../types/auth.types";

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "auth_user";

function getStoredUser(): AuthUser | null {
    try {
        const value = localStorage.getItem(USER_KEY);
        return value ? JSON.parse(value) as AuthUser : null;
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
}

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<AuthUser | null>(getStoredUser);

    function saveSession(data: AuthResponse) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        setUser(data.user);
    }

    async function login(data: LoginRequest) {
        const response = await loginUser(data);
        saveSession(response);
    }

    async function register(data: RegisterRequest) {
        const response = await registerUser(data);
        saveSession(response);
    }

    async function logout() {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        try {
            if (refreshToken) {
                await logoutUser(refreshToken);
            }
        } catch (error) {
            console.error("Ошибка завершения сессииЖ", error);
        } finally {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);

            setUser(null);
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: user !== null,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth должен использоваться внутри AuthProvider"
        );
    }

    return context;
}