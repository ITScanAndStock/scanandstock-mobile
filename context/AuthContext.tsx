// contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import AuthService from "../services/AuthService";
import ToastService from "../services/ToastService";

interface AuthContextData {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const lastActiveTime = useRef<number>(Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          const inactiveTime = Date.now() - lastActiveTime.current;
          // Vérifier le token directement au lieu de la variable d'état
          const isValid = await AuthService.isTokenValid();
          if (inactiveTime > INACTIVE_TIMEOUT && isValid) {
            await logout();
          }
        } else if (nextAppState.match(/inactive|background/)) {
          lastActiveTime.current = Date.now();
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(
    () =>
      AuthService.onSessionEnded(() => {
        setIsAuthenticated(false);
      }),
    [],
  );

  const checkAuth = async () => {
    try {
      const isValid = await AuthService.isTokenValid();
      setIsAuthenticated(isValid);
    } catch (error) {
      console.error("❌ AuthContext - Erreur checkAuth:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("🚀 AuthContext - Initialisation de l'authentification...");
        await checkAuth();
      } catch (error) {
        console.error("❌ Erreur initialisation auth:", error);
      } finally {
        setIsLoading(false); // Important: toujours passer à false
        console.log("✅ AuthContext - Initialisation terminée");
      }
    };

    initAuth();
  }, []);

  const login = async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Appeler le service d'authentification
      const success = await AuthService.login();

      if (success) {
        setIsAuthenticated(true);
        ToastService.success("Connexion réussie", "Bienvenue");
        return true;
      } else {
        setIsAuthenticated(false);
        ToastService.error("La connexion a échoué", "Erreur de connexion");
        return false;
      }
    } catch (error) {
      console.error("❌ Erreur de connexion:", error);
      setIsAuthenticated(false);
      ToastService.error(
        "Une erreur est survenue lors de la connexion",
        "Erreur"
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  const logout = async () => {
    try {
      setIsLoading(true);
      await AuthService.logout();
      setIsAuthenticated(false);
      ToastService.info("Vous avez été déconnecté", "Déconnexion");
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur de déconnexion:", error);
      }
      ToastService.error("Erreur lors de la déconnexion", "Erreur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
