import { useEffect, useState, useCallback } from "react";

export type SubItem = {
  id: string;
  nome: string;
  quantidade: number;
  descricao?: string;
  imagem?: string;
  criadoEm: number;
};

export type Vaga = {
  id: string;
  codigo: string;
  setor: string;
  capacidade: number;
  observacoes?: string;
  subItens: SubItem[];
  criadoEm: number;
};

const STORAGE_KEY = "estoque-vagas-v1";

function readStorage(): Vaga[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Vaga[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(vagas: Vaga[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vagas));
  window.dispatchEvent(new CustomEvent("vagas:changed"));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useVagas() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setVagas(readStorage());
    setHydrated(true);
    const handler = () => setVagas(readStorage());
    window.addEventListener("vagas:changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("vagas:changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addVaga = useCallback((data: Omit<Vaga, "id" | "subItens" | "criadoEm">) => {
    const novo: Vaga = { ...data, id: uid(), subItens: [], criadoEm: Date.now() };
    writeStorage([novo, ...readStorage()]);
    return novo;
  }, []);

  const removeVaga = useCallback((id: string) => {
    writeStorage(readStorage().filter((v) => v.id !== id));
  }, []);

  const updateVaga = useCallback((id: string, patch: Partial<Vaga>) => {
    writeStorage(readStorage().map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const addSubItem = useCallback(
    (vagaId: string, data: Omit<SubItem, "id" | "criadoEm">) => {
      const novo: SubItem = { ...data, id: uid(), criadoEm: Date.now() };
      writeStorage(
        readStorage().map((v) =>
          v.id === vagaId ? { ...v, subItens: [novo, ...v.subItens] } : v,
        ),
      );
    },
    [],
  );

  const removeSubItem = useCallback((vagaId: string, subId: string) => {
    writeStorage(
      readStorage().map((v) =>
        v.id === vagaId ? { ...v, subItens: v.subItens.filter((s) => s.id !== subId) } : v,
      ),
    );
  }, []);

  const updateSubItem = useCallback(
    (vagaId: string, subId: string, patch: Omit<SubItem, "id" | "criadoEm">) => {
      writeStorage(
        readStorage().map((v) =>
          v.id === vagaId
            ? {
                ...v,
                subItens: v.subItens.map((s) =>
                  s.id === subId
                    ? {
                        ...s,
                        nome: patch.nome,
                        quantidade: patch.quantidade,
                        descricao: patch.descricao,
                        imagem: patch.imagem,
                      }
                    : s,
                ),
              }
            : v,
        ),
      );
    },
    [],
  );

  return { vagas, hydrated, addVaga, removeVaga, updateVaga, addSubItem, removeSubItem, updateSubItem };
}

export function useVaga(id: string) {
  const store = useVagas();
  const vaga = store.vagas.find((v) => v.id === id);
  return { ...store, vaga };
}
