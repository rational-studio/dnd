import { useCallback, useRef, type MutableRefObject } from 'react';

export function useMergeRefs<T>(refs: (React.Ref<T> | undefined)[]) {
  const list = useRef(refs);
  list.current = refs;
  return useCallback((value: T | null) => {
    list &&
      list.current.forEach(ref => {
        if (typeof ref === 'function') {
          ref(value);
        } else if (ref) {
          (ref as MutableRefObject<T | null>).current = value;
        }
      });
  }, []);
}
