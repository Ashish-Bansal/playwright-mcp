import { useCallback, useEffect, useState } from "react";

export const useGlobalState = () => {
  const [state, setState] = useState(window.globalState);

  useEffect(() => {
    // Subscribe to changes from other components/Node
    const subscriptionId = window.stateSubscribers.length;
    window.stateSubscribers.push(setState);

    return () => {
      window.stateSubscribers = window.stateSubscribers.filter(
        (_, index) => index !== subscriptionId
      );
    };
  }, []);

  // Create an update function that syncs with Node
  const updateState = useCallback((update: any) => {
    window.updateGlobalState(update);
  }, []);

  return [state, updateState];
}
