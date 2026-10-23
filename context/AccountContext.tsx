import {
  BADGE_DEADLINE_KEY,
  BADGE_DURATION_MS,
  createBadgeTimer,
  parseStoredDeadline,
  type RemoveScope,
} from "@/services/BadgeTimer";
import BadgeServices from "@/services/BadgeServices";
import ToastService from "@/services/ToastService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
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

type StoredBadge = { id: string; name: string; scan: string; deadline: number };

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
  const deadline = await AsyncStorage.getItem(BADGE_DEADLINE_KEY);
  if (!badgeId || !userName || !badgeScan) {
    return null;
  }
  return {
    id: String(JSON.parse(badgeId)),
    name: String(JSON.parse(userName)),
    scan: String(JSON.parse(badgeScan)),
    deadline: parseStoredDeadline(deadline),
  };
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccountState] = useState<Account | null>(null);
  const [isTracingEnabled, setIsTracingEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isAuthenticatedRef = useRef(isAuthenticated);
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);
  const [activeBadgeName, setActiveBadgeName] = useState("");

  const removeBadge = useCallback(async (scope: RemoveScope) => {
    HeaderStore.setBadgeScan(undefined);
    setActiveBadgeId(null);
    setActiveBadgeName("");
    if (scope === "memory") {
      return true;
    }
    try {
      await AsyncStorage.multiRemove(["badge_id", "user_name", "badge-scan", BADGE_DEADLINE_KEY]);
      return true;
    } catch (error) {
      if (__DEV__) {
        console.error("Erreur lors de la déconnexion du badge:", error);
      }
      return false;
    }
  }, []);

  const [badgeTimer] = useState(() =>
    createBadgeTimer({
      durationMs: BADGE_DURATION_MS,
      now: Date.now,
      remove: removeBadge,
      confirm: () => ToastService.info("Badge déconnecté avec succès"),
      saveDeadline: (deadline) => {
        AsyncStorage.setItem(BADGE_DEADLINE_KEY, String(deadline)).catch((error) => {
          if (__DEV__) {
            console.error("Erreur enregistrement échéance du badge:", error);
          }
        });
      },
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
    async (stored: StoredBadge | null) => {
      if (!stored) {
        HeaderStore.setBadgeScan(undefined);
        return;
      }
      if (!isAuthenticatedRef.current) {
        await removeBadge("all");
        return;
      }
      badgeTimer.badgeConnected(stored.deadline);
      if (badgeTimer.isBadgeValid()) {
        setActiveBadgeId(stored.id);
        setActiveBadgeName(stored.name);
        HeaderStore.setBadgeScan(stored.scan);
      }
    },
    [badgeTimer, removeBadge],
  );

  // Declared before the load effect, so the load and an in-flight getBadge see the session of this render.
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      badgeTimer.cancel();
    }
    const badgeLoad = isAuthLoading
      ? Promise.resolve()
      : readBadge()
          .then(applyBadge)
          .catch((error) => {
            if (__DEV__) {
              console.error("Erreur chargement badge:", error);
            }
          });
    Promise.all([
      readAccounts()
        .then(applyAccounts)
        .catch((error) => {
          if (__DEV__) {
            console.error("Erreur chargement comptes:", error);
          }
        }),
      badgeLoad,
    ]).finally(() => setIsLoading(false));
  }, [isAuthenticated, isAuthLoading, badgeTimer, applyAccounts, applyBadge]);

  useEffect(() => () => badgeTimer.cancel(), [badgeTimer]);

  const getBadge = async (badge: string) => {
    try {
      setIsLoading(true);
      const succes = await BadgeServices.getBadge(badge);
      if (succes) {
        await applyBadge(await readBadge());
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
