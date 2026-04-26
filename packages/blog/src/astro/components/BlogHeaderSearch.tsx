import { useCallback, useEffect, useState } from "react";

const SEARCH_RESULT_LIMIT = 8;
const BLUR_DELAY_MS = 150;

const useHeaderSearch = () => {
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<
    { category: string; ym: string; slug: string; Title: string }[]
  >([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    import("@mijime/blog/duckdb").then(({ getDB }) =>
      getDB()
        .then(() => setReady(true))
        .catch(() => {}),
    );
  }, []);

  const search = useCallback(
    (q: string) => {
      if (!ready || !q.trim()) {
        setResults([]);
        setOpen(false);
        return Promise.resolve();
      }
      const base = globalThis.window.location.origin;
      return import("@mijime/blog/duckdb")
        .then(({ queryBlogMeta }) =>
          import("@mijime/blog/search").then(({ parseQuery, toSQL }) => {
            const sql = toSQL(parseQuery(q), `read_parquet('${base}/blog-meta.parquet')`);
            return queryBlogMeta(sql);
          }),
        )
        .then((rows) => {
          const typed = rows as { category: string; ym: string; slug: string; Title: string }[];
          setResults(typed.slice(0, SEARCH_RESULT_LIMIT));
          setOpen(typed.length > 0);
        })
        .catch(() => {
          setResults([]);
          setOpen(false);
        });
    },
    [ready],
  );

  return { input, open, ready, results, search, setInput, setOpen };
};

export function BlogHeaderSearch() {
  const { input, open, ready, results, search, setInput, setOpen } = useHeaderSearch();

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
    if (results.length > 0) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      window.location.href = `/blog/search?q=${encodeURIComponent(input)}`;
      setOpen(false);
    }
    if (e.key === "Escape") setOpen(false);
  };

  const placeholder = ready ? "search…" : "loading…";

  return (
    <div className="blog-search-inline" style={{ position: "relative" }}>
      <input
        className="blog-search-input"
        placeholder={placeholder}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={!ready}
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
