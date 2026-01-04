import { useCallback } from "react";

let sessionAuthorized = false;

export const useCodeAuthSession = () => {
  const isSessionAuthorized = useCallback(() => sessionAuthorized, []);

  const markSessionAuthorized = useCallback(() => {
    sessionAuthorized = true;
  }, []);

  const resetSessionAuthorized = useCallback(() => {
    sessionAuthorized = false;
  }, []);

  return {
    isSessionAuthorized,
    markSessionAuthorized,
    resetSessionAuthorized,
  };
};
