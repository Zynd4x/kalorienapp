import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { seedRecipes } from '../data/recipes';
import { clearState, loadState, saveState, type PersistedState } from '../lib/storage';
import { scaleMacros, sumMacros } from '../lib/nutrition';
import { todayKey } from '../lib/date';
import {
  clearSharedConnection,
  loadSharedConnection,
  saveSharedConnection,
} from '../lib/sharedConnection';
import {
  sendShoppingRequest,
  withConnection,
  type ShoppingMutation,
} from '../api/shoppingSync';
import type {
  DiaryEntry,
  Food,
  Goals,
  Macros,
  Meal,
  Recipe,
  SharedActionResult,
  SharedConnection,
  SharedRoomState,
  SharedStatus,
  ShoppingItem,
} from '../types';

const DEFAULT_GOALS: Goals = {
  kcal: 2100,
  protein: 140,
  carbs: 230,
  fat: 70,
};

const initialState: PersistedState = {
  goals: DEFAULT_GOALS,
  entries: [],
  shopping: [],
  recipes: seedRecipes,
  water: {},
};

const SYNC_INTERVAL_MS = 2000;

export function createId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

let operationSequence = 0;

function createOperationId(): string {
  operationSequence += 1;
  return `${Date.now().toString(36)}-${operationSequence.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

interface AddEntryInput {
  date: string;
  meal: Meal;
  food: Food;
  grams: number;
}

export interface FoodSelection {
  food: Food;
  scanned: boolean;
}

type NewShoppingItem = Omit<ShoppingItem, 'id' | 'checked' | 'createdAt'> & {
  checked?: boolean;
};

interface AppContextValue extends PersistedState {
  hydrated: boolean;
  diaryDate: string;
  setDiaryDate: (date: string) => void;
  selection: FoodSelection | null;
  selectFood: (food: Food, scanned?: boolean) => void;
  clearSelection: () => void;
  setGoals: (goals: Goals) => void;
  addEntry: (input: AddEntryInput) => void;
  removeEntry: (id: string) => void;
  entriesForDate: (date: string) => DiaryEntry[];
  totalsForDate: (date: string) => Macros;
  addWater: (date: string, delta: number) => void;
  addShoppingItem: (item: NewShoppingItem) => void;
  addShoppingItems: (items: NewShoppingItem[]) => number;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  clearCompleted: () => void;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'isCustom'>) => string;
  deleteRecipe: (id: string) => void;
  addRecipeToShoppingList: (recipe: Recipe, servings: number) => number;
  resetAll: () => Promise<void>;
  sharedConnection: SharedConnection | null;
  sharedStatus: SharedStatus;
  sharedError: string | null;
  sharedVersion: number;
  sharedLastSync: number | null;
  createSharedRoom: (name: string, password: string) => Promise<SharedActionResult>;
  joinSharedRoom: (
    name: string,
    room: string,
    password: string,
  ) => Promise<SharedActionResult>;
  leaveSharedRoom: () => Promise<void>;
  syncSharedNow: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function mergeRecipes(stored: Recipe[] | undefined): Recipe[] {
  const custom = stored ?? [];
  const existing = new Set(custom.map((recipe) => recipe.id));
  return [...custom, ...seedRecipes.filter((recipe) => !existing.has(recipe.id))];
}

function applyPendingOperations(
  items: ShoppingItem[],
  operations: ShoppingMutation[],
): ShoppingItem[] {
  let next = items;

  for (const operation of operations) {
    if (operation.op === 'add') {
      if (!next.some((item) => item.id === operation.item.id)) {
        next = [operation.item, ...next];
      }
      continue;
    }

    if (operation.op === 'addMany') {
      const existing = new Set(next.map((item) => item.id));
      const additions = operation.items.filter(
        (item) => !existing.has(item.id),
      );
      if (additions.length > 0) next = [...additions, ...next];
      continue;
    }

    if (operation.op === 'setChecked') {
      next = next.map((item) =>
        item.id === operation.itemId
          ? { ...item, checked: operation.checked }
          : item,
      );
      continue;
    }

    if (operation.op === 'remove') {
      next = next.filter((item) => item.id !== operation.itemId);
      continue;
    }

    if (operation.op === 'clearCompleted') {
      const ids = new Set(operation.itemIds);
      next = next.filter((item) => !(ids.has(item.id) && item.checked));
    }
  }

  return next;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [diaryDate, setDiaryDate] = useState(todayKey());
  const [selection, setSelection] = useState<FoodSelection | null>(null);

  const [sharedConnection, setSharedConnection] =
    useState<SharedConnection | null>(null);
  const [sharedStatus, setSharedStatus] =
    useState<SharedStatus>('disconnected');
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [sharedVersion, setSharedVersion] = useState(0);
  const [sharedLastSync, setSharedLastSync] = useState<number | null>(null);

  const shoppingRef = useRef<ShoppingItem[]>(initialState.shopping);
  const connectionRef = useRef<SharedConnection | null>(null);
  const pendingRef = useRef<ShoppingMutation[]>([]);
  const processingRef = useRef(false);
  const tickRef = useRef(false);
  const sharedVersionRef = useRef(0);

  const selectFood = useCallback((food: Food, scanned = false) => {
    setSelection({ food, scanned });
  }, []);

  const clearSelection = useCallback(() => setSelection(null), []);

  const updateShopping = useCallback(
    (updater: (items: ShoppingItem[]) => ShoppingItem[]) => {
      const next = updater(shoppingRef.current);
      shoppingRef.current = next;
      setState((current) => ({ ...current, shopping: next }));
    },
    [],
  );

  const applyServerState = useCallback(
    (roomState: SharedRoomState) => {
      if (roomState.version < sharedVersionRef.current) return;
      sharedVersionRef.current = roomState.version;
      const next = applyPendingOperations(roomState.items, pendingRef.current);
      shoppingRef.current = next;
      setSharedVersion(roomState.version);
      setSharedLastSync(Date.now());
      setState((current) => ({ ...current, shopping: next }));
    },
    [],
  );

  const flushQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (!connectionRef.current) return;

    processingRef.current = true;
    try {
      while (connectionRef.current) {
        const operation = pendingRef.current[0];
        if (!operation) break;

        const connection = connectionRef.current;
        const result = await sendShoppingRequest(
          withConnection(operation, connection.room, connection.password),
        );

        if (!connectionRef.current) break;
        if (pendingRef.current[0] !== operation) continue;

        if (!result.ok) {
          if (
            result.error === 'ROOM_NOT_FOUND' ||
            result.error === 'WRONG_PASSWORD'
          ) {
            setSharedStatus('error');
            setSharedError(
              result.message ?? 'Die Verbindung zum Raum ist fehlgeschlagen.',
            );
          } else {
            setSharedStatus('offline');
            setSharedError(
              result.message ?? 'Die Synchronisierung ist gerade nicht möglich.',
            );
          }
          break;
        }

        pendingRef.current.shift();
        if (result.state) applyServerState(result.state);
        setSharedStatus('online');
        setSharedError(null);
      }
    } finally {
      processingRef.current = false;
    }
  }, [applyServerState]);

  const pullSharedState = useCallback(async () => {
    const connection = connectionRef.current;
    if (!connection) return;

    const result = await sendShoppingRequest({
      op: 'sync',
      room: connection.room,
      password: connection.password,
    });

    if (!connectionRef.current) return;

    if (result.ok && result.state) {
      applyServerState(result.state);
      setSharedStatus('online');
      setSharedError(null);
      return;
    }

    if (
      result.error === 'ROOM_NOT_FOUND' ||
      result.error === 'WRONG_PASSWORD'
    ) {
      setSharedStatus('error');
      setSharedError(
        result.message ?? 'Die Verbindung zum Raum ist fehlgeschlagen.',
      );
      return;
    }

    setSharedStatus('offline');
    setSharedError(
      result.message ?? 'Die Synchronisierung ist gerade nicht möglich.',
    );
  }, [applyServerState]);

  const runSharedTick = useCallback(async () => {
    if (tickRef.current || !connectionRef.current) return;
    tickRef.current = true;
    try {
      await flushQueue();
      if (pendingRef.current.length === 0) {
        await pullSharedState();
      }
    } finally {
      tickRef.current = false;
    }
  }, [flushQueue, pullSharedState]);

  const enqueue = useCallback(
    (operation: ShoppingMutation) => {
      if (!connectionRef.current) return;
      pendingRef.current.push(operation);
      void flushQueue();
    },
    [flushQueue],
  );

  useEffect(() => {
    let mounted = true;

    loadState()
      .then((stored) => {
        if (!mounted || !stored) return;
        setState((current) => ({
          goals: { ...current.goals, ...(stored.goals ?? {}) },
          entries: Array.isArray(stored.entries) ? stored.entries : current.entries,
          shopping: Array.isArray(stored.shopping)
            ? stored.shopping
            : current.shopping,
          recipes: mergeRecipes(stored.recipes),
          water:
            stored.water && typeof stored.water === 'object'
              ? stored.water
              : current.water,
        }));
        if (Array.isArray(stored.shopping)) {
          shoppingRef.current = stored.shopping;
        }
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    shoppingRef.current = state.shopping;
  }, [state.shopping]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      saveState(state).catch(() => {
        // Speichern ist unkritisch: Die App funktioniert auch ohne Persistenz.
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    loadSharedConnection().then(async (stored) => {
      if (!stored || cancelled) return;

      connectionRef.current = stored;
      sharedVersionRef.current = 0;
      setSharedConnection(stored);
      setSharedStatus('connecting');
      setSharedError(null);

      const result = await sendShoppingRequest({
        op: 'sync',
        room: stored.room,
        password: stored.password,
      });

      if (cancelled || !connectionRef.current) return;

      if (result.ok && result.state) {
        applyServerState(result.state);
        setSharedStatus('online');
        setSharedError(null);
        return;
      }

      setSharedStatus(
        result.error === 'ROOM_NOT_FOUND' || result.error === 'WRONG_PASSWORD'
          ? 'error'
          : 'offline',
      );
      setSharedError(
        result.message ?? 'Die gemeinsame Liste ist gerade nicht erreichbar.',
      );
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, applyServerState]);

  useEffect(() => {
    if (!sharedConnection) return;
    let cancelled = false;

    const run = () => {
      if (!cancelled) void runSharedTick();
    };

    run();
    const timer = setInterval(run, SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sharedConnection, runSharedTick]);

  const setGoals = useCallback((goals: Goals) => {
    setState((current) => ({ ...current, goals }));
  }, []);

  const addEntry = useCallback((input: AddEntryInput) => {
    const entry: DiaryEntry = {
      id: createId('entry'),
      date: input.date,
      meal: input.meal,
      food: input.food,
      grams: input.grams,
      createdAt: Date.now(),
    };
    setState((current) => ({
      ...current,
      entries: [entry, ...current.entries],
    }));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }));
  }, []);

  const entriesForDate = useCallback(
    (date: string) =>
      state.entries
        .filter((entry) => entry.date === date)
        .sort((a, b) => a.createdAt - b.createdAt),
    [state.entries],
  );

  const totalsForDate = useCallback(
    (date: string) => {
      const entries = state.entries.filter((entry) => entry.date === date);
      return sumMacros(
        entries.map((entry) => scaleMacros(entry.food.per100, entry.grams)),
      );
    },
    [state.entries],
  );

  const addWater = useCallback((date: string, delta: number) => {
    setState((current) => {
      const next = Math.max(0, Math.min(20, (current.water[date] ?? 0) + delta));
      return { ...current, water: { ...current.water, [date]: next } };
    });
  }, []);

  const addShoppingItem = useCallback(
    (item: NewShoppingItem) => {
      const entry: ShoppingItem = {
        ...item,
        id: createId('item'),
        checked: item.checked ?? false,
        createdAt: Date.now(),
      };
      updateShopping((current) => [entry, ...current]);
      enqueue({ op: 'add', opId: createOperationId(), item: entry });
    },
    [enqueue, updateShopping],
  );

  const addShoppingItems = useCallback(
    (items: NewShoppingItem[]) => {
      if (items.length === 0) return 0;
      const now = Date.now();
      const entries: ShoppingItem[] = items.map((item, index) => ({
        ...item,
        id: createId('item'),
        checked: item.checked ?? false,
        createdAt: now + index,
      }));
      updateShopping((current) => [...entries, ...current]);
      enqueue({
        op: 'addMany',
        opId: createOperationId(),
        items: entries,
      });
      return entries.length;
    },
    [enqueue, updateShopping],
  );

  const toggleShoppingItem = useCallback(
    (id: string) => {
      const currentItem = shoppingRef.current.find((item) => item.id === id);
      if (!currentItem) return;
      const checked = !currentItem.checked;
      updateShopping((current) =>
        current.map((item) =>
          item.id === id ? { ...item, checked } : item,
        ),
      );
      enqueue({
        op: 'setChecked',
        opId: createOperationId(),
        itemId: id,
        checked,
      });
    },
    [enqueue, updateShopping],
  );

  const removeShoppingItem = useCallback(
    (id: string) => {
      updateShopping((current) => current.filter((item) => item.id !== id));
      enqueue({ op: 'remove', opId: createOperationId(), itemId: id });
    },
    [enqueue, updateShopping],
  );

  const clearCompleted = useCallback(() => {
    const ids = shoppingRef.current
      .filter((item) => item.checked)
      .map((item) => item.id);
    if (ids.length === 0) return;
    updateShopping((current) => current.filter((item) => !item.checked));
    enqueue({
      op: 'clearCompleted',
      opId: createOperationId(),
      itemIds: ids,
    });
  }, [enqueue, updateShopping]);

  const addRecipe = useCallback(
    (recipe: Omit<Recipe, 'id' | 'createdAt' | 'isCustom'>) => {
      const id = createId('recipe');
      const entry: Recipe = {
        ...recipe,
        id,
        createdAt: Date.now(),
        isCustom: true,
      };
      setState((current) => ({
        ...current,
        recipes: [entry, ...current.recipes],
      }));
      return id;
    },
    [],
  );

  const deleteRecipe = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      recipes: current.recipes.filter((recipe) => recipe.id !== id),
    }));
  }, []);

  const addRecipeToShoppingList = useCallback(
    (recipe: Recipe, servings: number) => {
      const factor =
        recipe.servings > 0 ? Math.max(0.5, servings / recipe.servings) : 1;
      const now = Date.now();
      const entries: ShoppingItem[] = recipe.ingredients.map(
        (ingredient, index) => ({
          id: createId('item'),
          name: ingredient.name,
          amount: scaleFactorAmount(ingredient.amount, factor),
          category: ingredient.category,
          checked: false,
          recipeId: recipe.id,
          createdAt: now + index,
        }),
      );
      updateShopping((current) => [...entries, ...current]);
      enqueue({
        op: 'addMany',
        opId: createOperationId(),
        items: entries,
      });
      return entries.length;
    },
    [enqueue, updateShopping],
  );

  const createSharedRoom = useCallback(
    async (name: string, password: string): Promise<SharedActionResult> => {
      const cleanName = name.trim();
      if (!cleanName) {
        return { ok: false, message: 'Bitte gib deinen Namen ein.' };
      }
      if (password.length < 4) {
        return {
          ok: false,
          message: 'Das Passwort muss mindestens 4 Zeichen lang sein.',
        };
      }

      setSharedStatus('connecting');
      setSharedError(null);

      const result = await sendShoppingRequest({
        op: 'create',
        name: cleanName,
        password,
        items: shoppingRef.current,
      });

      if (!result.ok || !result.state) {
        const message =
          result.message ?? 'Der Raum konnte nicht erstellt werden.';
        setSharedStatus('error');
        setSharedError(message);
        return { ok: false, message };
      }

      const connection: SharedConnection = {
        room: result.state.room,
        password,
        name: cleanName,
      };

      connectionRef.current = connection;
      pendingRef.current = [];
      sharedVersionRef.current = 0;
      setSharedConnection(connection);
      applyServerState(result.state);
      setSharedStatus('online');
      setSharedError(null);
      await saveSharedConnection(connection);

      return { ok: true };
    },
    [applyServerState],
  );

  const joinSharedRoom = useCallback(
    async (
      name: string,
      room: string,
      password: string,
    ): Promise<SharedActionResult> => {
      const cleanName = name.trim();
      const cleanRoom = room
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      if (!cleanName) {
        return { ok: false, message: 'Bitte gib deinen Namen ein.' };
      }
      if (cleanRoom.length < 4) {
        return { ok: false, message: 'Bitte gib einen gültigen Raumcode ein.' };
      }
      if (password.length < 4) {
        return {
          ok: false,
          message: 'Das Passwort muss mindestens 4 Zeichen lang sein.',
        };
      }

      setSharedStatus('connecting');
      setSharedError(null);

      const result = await sendShoppingRequest({
        op: 'join',
        name: cleanName,
        room: cleanRoom,
        password,
        items: shoppingRef.current,
      });

      if (!result.ok || !result.state) {
        const message =
          result.message ?? 'Dem Raum konnte nicht beigetreten werden.';
        setSharedStatus('error');
        setSharedError(message);
        return { ok: false, message };
      }

      const connection: SharedConnection = {
        room: result.state.room,
        password,
        name: cleanName,
      };

      connectionRef.current = connection;
      pendingRef.current = [];
      sharedVersionRef.current = 0;
      setSharedConnection(connection);
      applyServerState(result.state);
      setSharedStatus('online');
      setSharedError(null);
      await saveSharedConnection(connection);

      return { ok: true };
    },
    [applyServerState],
  );

  const leaveSharedRoom = useCallback(async () => {
    connectionRef.current = null;
    pendingRef.current = [];
    sharedVersionRef.current = 0;
    setSharedConnection(null);
    setSharedStatus('disconnected');
    setSharedError(null);
    setSharedVersion(0);
    setSharedLastSync(null);
    await clearSharedConnection();
  }, []);

  const syncSharedNow = useCallback(async () => {
    if (!connectionRef.current) return;
    setSharedStatus('connecting');
    await runSharedTick();
  }, [runSharedTick]);

  const resetAll = useCallback(async () => {
    await clearState();
    await clearSharedConnection();
    connectionRef.current = null;
    pendingRef.current = [];
    sharedVersionRef.current = 0;
    setSharedConnection(null);
    setSharedStatus('disconnected');
    setSharedError(null);
    setSharedVersion(0);
    setSharedLastSync(null);
    shoppingRef.current = [];
    setState({ ...initialState, recipes: seedRecipes });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      hydrated,
      diaryDate,
      setDiaryDate,
      selection,
      selectFood,
      clearSelection,
      setGoals,
      addEntry,
      removeEntry,
      entriesForDate,
      totalsForDate,
      addWater,
      addShoppingItem,
      addShoppingItems,
      toggleShoppingItem,
      removeShoppingItem,
      clearCompleted,
      addRecipe,
      deleteRecipe,
      addRecipeToShoppingList,
      resetAll,
      sharedConnection,
      sharedStatus,
      sharedError,
      sharedVersion,
      sharedLastSync,
      createSharedRoom,
      joinSharedRoom,
      leaveSharedRoom,
      syncSharedNow,
    }),
    [
      state,
      hydrated,
      diaryDate,
      setDiaryDate,
      selection,
      selectFood,
      clearSelection,
      setGoals,
      addEntry,
      removeEntry,
      entriesForDate,
      totalsForDate,
      addWater,
      addShoppingItem,
      addShoppingItems,
      toggleShoppingItem,
      removeShoppingItem,
      clearCompleted,
      addRecipe,
      deleteRecipe,
      addRecipeToShoppingList,
      resetAll,
      sharedConnection,
      sharedStatus,
      sharedError,
      sharedVersion,
      sharedLastSync,
      createSharedRoom,
      joinSharedRoom,
      leaveSharedRoom,
      syncSharedNow,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function scaleFactorAmount(amount: string, factor: number): string {
  const match = amount.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return amount;
  const value = Number(match[1].replace(',', '.')) * factor;
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace('.', ',');
  return `${text} ${match[2]}`.trim();
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp muss innerhalb von AppProvider verwendet werden.');
  }
  return context;
}
