'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

/** رنگ/گزینهٔ انتخاب‌شده، مشترک بین گالری و جعبهٔ خرید */
const Ctx = createContext<{ selected: (string | null)[]; setSelected: (s: (string | null)[]) => void }>({ selected: [], setSelected: () => {} });
export const useSelection = () => useContext(Ctx);

export default function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<(string | null)[]>([]);
  return <Ctx.Provider value={{ selected, setSelected }}>{children}</Ctx.Provider>;
}
