import { BADGE_DURATION_MS, createBadgeTimer, type RemoveScope } from "@/services/BadgeTimer";
import BadgeServices from "@/services/BadgeServices";
import ToastService from "@/services/ToastService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  activeBadgeId: string | null;
  activeBadgeName: string;
  getBadge: (badge: string) => Promise<void>;
  resetBadge: () => Promise<void>;
  isBadgeValid: () => boolean;
  scanSent: () => void;
}

type StoredAccounts = {
  accounts?: Account[];
  activeAccount?: Account;
  tracingEnabled?: boolean;
};

type StoredBadge = { id: string; name: string; scan: string };

async function readAccounts(): Promise<StoredAccounts> {
  const accountsString = await AsyncStorage.getItem("account");
  const activeAccountString = await AsyncStorage.getItem("activated_compte");
  const tracingEnabled = await AsyncStorage.getItem("tracingEnabled");
  return {
    accounts: accountsString ? JSON.parse(accountsString) : undefined,
    activeAccount: activeAccountString ? JSON.parse(activeAccountString) : undefined,
    tracingEnabled: tracingEnabled ? JSON.parse(tracingEnabled) : undefined,
  };
}

async function readBadge(): Promise<StoredBadge | null> {
  const badgeId = await AsyncStorage.getItem("badge_id");
  const userName = await AsyncStorage.getItem("user_name");
  const badgeScan = await AsyncStorage.getItem("badge-scan");
  if (!badgeId || !userName || !badgeScan) {
    return null;
  }
  return {
    id: String(JSON.parse(badgeId)),
    name: String(JSON.parse(userName)),
    scan: String(JSON.parse(badgeScan)),
  };
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccountState] = useState<Account | null>(null);
  const [isTracingEnabled, setIsTracingEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);
  const [activeBadgeName, setActiveBadgeName] = useState("");

  const removeBadge = async (scope: RemoveScope) => {
    HeaderStore.setBadgeScan(undefined);
    setActiveBadgeId(null);
    setActiveBadgeName("");
    if (scope === "memory") {
      return true;
    }
    try {
      await AsyncStorage.multiRemove(["badge_id", "user_name", "badge-scan"]);
      return true;
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur lors de la déconnexion du badge:", error);
      }
      return false;
    }
  };

  const [badgeTimer] = useState(() =>
    createBadgeTimer({
      durationMs: BADGE_DURATION_MS,
      now: Date.now,
      remove: removeBadge,
      confirm: () => ToastService.info("Badge déconnecté avec succès"),
    }),
  );

  const applyAccounts = useCallback((stored: StoredAccounts) => {
    if (stored.accounts) {
      setAccounts(stored.accounts);
    }
    if (stored.activeAccount) {
      setActiveAccountState(stored.activeAccount);
    }
    HeaderStore.setAccountId(stored.activeAccount?.id);
    if (stored.tracingEnabled !== undefined) {
      setIsTracingEnabled(stored.tracingEnabled);
    }
    HeaderStore.setTracingEnabled(stored.tracingEnabled);
  }, []);

  const applyBadge = useCallback(
    (stored: StoredBadge | null) => {
      if (stored) {
        setActiveBadgeId(stored.id);
        setActiveBadgeName(stored.name);
        HeaderStore.setBadgeScan(stored.scan);
        badgeTimer.badgeConnected();
      } else {
        HeaderStore.setBadgeScan(undefined);
      }
    },
    [badgeTimer],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      badgeTimer.cancel();
    }
    Promise.all([
      readAccounts()
        .then(applyAccounts)
        .catch((error) => {
          if (__DEV__) {
            console.error("Erreur chargement comptes:", error);
          }
        }),
      readBadge()
        .then(applyBadge)
        .catch((error) => {
          if (__DEV__) {
            console.error("Erreur chargement badge:", error);
          }
        }),
    ]).finally(() => setIsLoading(false));
  }, [isAuthenticated, badgeTimer, applyAccounts, applyBadge]);

  useEffect(() => () => badgeTimer.cancel(), [badgeTimer]);

  const getBadge = async (badge: string) => {
    try {
      setIsLoading(true);
      const succes = await BadgeServices.getBadge(badge);
      if (succes) {
        applyBadge(await readBadge());
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur connexion badge:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetAccount = async () => {
    badgeTimer.cancel();
    setAccounts([]);
    setActiveAccountState(null);
    setIsTracingEnabled(false);
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
        resetBadge: badgeTimer.removeManually,
        isBadgeValid: badgeTimer.isBadgeValid,
        scanSent: badgeTimer.scanSent,
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
