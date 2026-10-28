import { useAccount } from "../context/AccountContext";
import { useAuth } from "../context/AuthContext";

export function useLogout() {
  const { logout } = useAuth();
  const { resetAccount } = useAccount();

  return () => {
    resetAccount();
    logout();
  };
}
