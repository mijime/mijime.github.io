import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_RESULT_LIMIT = 8;
const BLUR_DELAY_MS = 150;

const useHeaderSearch = () => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<
    { category: string; ym: string; slug: string; Title: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const initPromise = useRef<Promise<void> | null>(null);
  const dbRef = useRef<{ queryBlogMeta: (sql: string) => Promise<unknown[]> } | null>(null);

  const initDB = useCallback(() => {
    if (!initPromise.current) {
      initPromise.current = import("@mijime/blog/duckdb")
        .then(async (mod) => {
          await mod.getDB();
          dbRef.current = mod;
        })
        .catch(() => {
          initPromise.current = null;
        });
    }
    return initPromise.current;
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      await initDB();
      const db = dbRef.current;
      if (!db) return;
      const base = globalThis.window.location.origin;
      try {
        const { parseQuery, toSQL } = await import("@mijime/blog/search");
        const sql = toSQL(parseQuery(q), `read_parquet('${base}/blog-meta.parquet')`);
        const rows = await db.queryBlogMeta(sql);
        const typed = rows as { category: string; ym: string; slug: string; Title: string }[];
        setResults(typed.slice(0, SEARCH_RESULT_LIMIT));
        setOpen(typed.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      }
    },
    [initDB],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(q), 500);
    },
    [search],
  );
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return { input, open, results, search: debouncedSearch, setInput, setOpen, initDB };
};

export function BlogHeaderSearch() {
  const { input, open, results, search, setInput, setOpen, initDB } = useHeaderSearch();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    search(e.target.value);
  };

  const handleBlur = () => {
    globalThis.setTimeout(() => {
      setOpen(false);
    }, BLUR_DELAY_MS);
  };

  const handleFocus = () => {
    initDB();
    if (results.length > 0) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      window.location.href = `/blog/search?q=${encodeURIComponent(input)}`;
      setOpen(false);
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="blog-search-inline" style={{ position: "relative" }}>
      <input
        className="blog-search-input"
        placeholder="search…"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
      {open && (
        <div className="blog-search-dropdown">
          {results.map((p) => (
            <a
              key={`${p.category}/${p.ym}/${p.slug}`}
              href={`/blog/${p.category}/${p.ym}/${p.slug}`}
              className="blog-search-dropdown-item"
              onClick={() => setOpen(false)}
            >
              {p.Title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
