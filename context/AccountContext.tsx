import BadgeServices from "@/services/BadgeServices";
import ToastService from "@/services/ToastService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Account } from "../model/Account";
import HeaderStore from "../state/HeaderStore";
import { useAuth } from "./AuthContext";

interface AccountContextType {
  accounts: Account[];
  activeAccount: Account | null;
  setActiveAccount: (account: Account) => Promise<void>;
  isLoading: boolean;
  isTracingEnabled: boolean | undefined;
  resetAccount: () => Promise<void>;
  activeBadgeId: string;
  activeBadgeName: string;
  getBadge: (badge: string) => Promise<void>;
  resetBadge: () => Promise<void>;
  resetAfterTimeout: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccountState] = useState<Account | null>(null);
  const [isTracingEnabled, setIsTracingEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const [badgeConnected, setBadgeConnected] = useState(false);
  const [activeBadgeId, setActiveBadgeId] = useState("");
  const [activeBadgeName, setActiveBadgeName] = useState("");
  const [activeBadgeScan, setActiveBadgeScan] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAccounts();
    loadBadge();
  }, [isAuthenticated, badgeConnected]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const accountsString = await AsyncStorage.getItem("account");
      const activeAccountString = await AsyncStorage.getItem(
        "activated_compte"
      );
      const tracingEnabled = await AsyncStorage.getItem("tracingEnabled");

      if (accountsString) {
        const parsedAccounts = JSON.parse(accountsString);
        setAccounts(parsedAccounts);
      }

      if (activeAccountString) {
        const parsedActiveAccount = JSON.parse(activeAccountString);
        setActiveAccountState(parsedActiveAccount);
        HeaderStore.setAccountId(parsedActiveAccount?.id);
      } else {
        HeaderStore.setAccountId(undefined);
      }

      if (tracingEnabled) {
        const parsedTracingEnabled = JSON.parse(tracingEnabled);
        setIsTracingEnabled(parsedTracingEnabled);
        HeaderStore.setTracingEnabled(parsedTracingEnabled);
      } else {
        HeaderStore.setTracingEnabled(undefined);
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur chargement comptes:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getBadge = async (badge: string) => {
    try {
      setIsLoading(true);
      const succes = await BadgeServices.getBadge(badge);
      if (succes) {
        setBadgeConnected(true);
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur connexion badge:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetAfterTimeout = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      resetBadge();
    }, 1 * 10 * 1000);
  };

  const loadBadge = async () => {
    try {
      setIsLoading(true);
      const badgeId = await AsyncStorage.getItem("badge_id");
      const userName = await AsyncStorage.getItem("user_name");
      const badgeScan = await AsyncStorage.getItem("badge-scan");

      if (badgeId && userName && badgeScan) {
        const parsedBadgeScan = String(JSON.parse(badgeScan));
        const parsedBadgeId = String(JSON.parse(badgeId));
        const parsedUserName = String(JSON.parse(userName));
        setActiveBadgeId(parsedBadgeId);
        setActiveBadgeName(parsedUserName);
        setActiveBadgeScan(parsedBadgeScan);
        HeaderStore.setBadgeScan(parsedBadgeScan);
        resetAfterTimeout();
      } else {
        HeaderStore.setBadgeScan(undefined);
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur chargement comptes:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetBadge = async () => {
    try {
      // Supprimer les données du badge de AsyncStorage
      await AsyncStorage.removeItem("badge_id");
      await AsyncStorage.removeItem("user_name");
      await AsyncStorage.removeItem("badge-scan");

      // Réinitialiser les états
      setActiveBadgeId("");
      setActiveBadgeName("");
      setActiveBadgeScan("");
      setBadgeConnected(false);
      HeaderStore.setBadgeScan(undefined);

      if (__DEV__) {
        console.log("✅ Badge déconnecté");
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur lors de la déconnexion du badge:", error);
      }
    } finally {
      ToastService.info("Badge déconnecté avec succès");
    }
  };

  const resetAccount = async () => {
    setAccounts([]);
    setActiveAccountState(null);
    setIsTracingEnabled(false);
    setActiveBadgeId("");
    setActiveBadgeName("");
    setActiveBadgeScan("");
    HeaderStore.reset();
  };

  const setActiveAccount = async (account: Account) => {
    try {
      await AsyncStorage.setItem("activated_compte", JSON.stringify(account));
      setActiveAccountState(account);
      HeaderStore.setAccountId(account.id);
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur sauvegarde compte actif:", error);
      }
    }
  };

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccount,
        setActiveAccount,
        isLoading,
        isTracingEnabled,
        resetAccount,
        activeBadgeId,
        activeBadgeName,
        getBadge,
        resetBadge,
        resetAfterTimeout,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount doit être utilisé dans AccountProvider");
  }
  return context;
}
