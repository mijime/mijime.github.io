import { useCallback, useEffect, useRef, useState } from "react";
import { parseQuery, toSQL } from "@mijime/blog/search";
import type { PostMeta } from "@mijime/blog";

const runSearch = async (
  query: string,
  setResults: (r: PostMeta[]) => void,
  setSearchError: (e: string | null) => void,
  setSearched: (s: boolean) => void,
) => {
  const base = globalThis.window.location.origin;
  const sql = toSQL(parseQuery(query), `read_parquet('${base}/blog-meta.parquet')`);
  try {
    const { queryBlogMeta } = await import("@mijime/blog/duckdb");
    const rows = await queryBlogMeta(sql);
    setResults(rows);
    setSearchError(null);
    setSearched(true);
  } catch (error: unknown) {
    setSearchError(String(error));
  }
};

const ResultCount = ({
  results,
  searched,
  searchError,
}: {
  results: PostMeta[];
  searched: boolean;
  searchError: string | null;
}) => {
  if (searchError) return <p className="search-status search-error">{searchError}</p>;
  if (!searched) return null;
  const suffix = results.length !== 1 ? "s" : "";
  return (
    <p className="search-status">
      {results.length} result{suffix}
    </p>
  );
};

export function BlogSearch() {
  const q =
    new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("q") ??
    undefined;
  const [input, setInput] = useState(q ?? "");
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<PostMeta[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const initRef = useRef(false);
  const pendingSearch = useRef<string | null>(null);

  const initDB = useCallback(() => {
    if (initRef.current) return;
    initRef.current = true;
    import("@mijime/blog/duckdb").then(({ getDB }) =>
      getDB()
        .then(() => setReady(true))
        .catch((error: unknown) => setSearchError(String(error))),
    );
  }, []);

  useEffect(() => {
    if (!ready) return;
    const pending = pendingSearch.current ?? q;
    if (pending) {
      pendingSearch.current = null;
      runSearch(pending, setResults, setSearchError, setSearched);
    }
  }, [ready, q]);

  useEffect(() => {
    if (q) initDB();
  }, [initDB]);

  const triggerSearch = (query: string) => {
    pendingSearch.current = query;
    initDB();
    if (ready) {
      pendingSearch.current = null;
      runSearch(query, setResults, setSearchError, setSearched);
    }
  };

  return (
    <div className="search-page">
      <h1>Search</h1>
      <div className="search-form">
        <input
          className="search-form-input"
          placeholder="alpha tags:react date>=:2024-01-01"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={initDB}
          onKeyDown={(e) => {
            if (e.key === "Enter") triggerSearch(input);
          }}
        />
        <button className="search-form-btn" onClick={() => triggerSearch(input)}>
          search
        </button>
      </div>
      <ResultCount results={results} searched={searched} searchError={searchError} />
      <ul className="post-list">
        {results.map((p) => (
          <li key={`${p.category}/${p.ym}/${p.slug}`} className="post-list-item">
            <span className="post-date">{(p.CreatedAt ?? p.ym).slice(0, 10)}</span>
            <div>
              <a href={`/blog/${p.category}/${p.ym}/${p.slug}`}>{p.Title}</a>
              {p.Tags && p.Tags.length > 0 && (
                <span>
                  {(Array.isArray(p.Tags) ? p.Tags : [p.Tags]).map((t) => (
                    <a key={t} href={`/blog/tag/${t}`} className="post-tag">
                      {t}
                    </a>
                  ))}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
