"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SidloFilter } from "@/components/SidloFilter";
import { CompanyCard } from "@/components/CompanyCard";
import { Pagination } from "@/components/Pagination";

interface CompanyBasic {
  ico: string;
  name: string;
  address: string;
  city: string;
}

interface SearchResponse {
  total: number;
  companies: CompanyBasic[];
  cities: string[];
  page: number;
  pageSize: number;
}

type Mode = "browse" | "search";

export default function Home() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [cityFilter, setCityFilter] = useState("");
  const [mode, setMode] = useState<Mode>("browse");

  // Browse DB (initial load + city filter)
  const doBrowse = useCallback(async (city: string = "", page: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (city) params.set("city", city);
      const res = await fetch(`/api/browse?${params}`);
      if (!res.ok) throw new Error("Failed to load companies");
      const data: SearchResponse = await res.json();
      setResults(data);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba načítání");
    } finally {
      setLoading(false);
    }
  }, []);

  // Search ARES
  const doSearch = async (query: string, page: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, page }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      const data: SearchResponse = await res.json();
      setResults(data);
      setCurrentQuery(query);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba vyhledávání");
    } finally {
      setLoading(false);
    }
  };

  // Initial load - show cached companies from DB
  useEffect(() => {
    doBrowse();
  }, [doBrowse]);

  const handleSearch = (query: string) => {
    setCityFilter("");
    setMode("search");
    doSearch(query, 0);
  };

  const handleCityChange = (city: string) => {
    setCityFilter(city);
    setMode("browse");
    setCurrentQuery("");
    doBrowse(city, 0);
  };

  const handlePageChange = (page: number) => {
    if (mode === "search") {
      doSearch(currentQuery, page);
    } else {
      doBrowse(cityFilter, page);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const companies = results?.companies ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Rejstřík firem ČR
          </h1>
          <SearchBar onSearch={handleSearch} isLoading={loading} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar - Filter (always visible) */}
          <aside className="w-56 shrink-0">
            <SidloFilter
              cities={results?.cities ?? []}
              cityFilter={cityFilter}
              onCityChange={handleCityChange}
            />
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-3">
            {loading && (
              <p className="text-gray-400 text-center py-10">Načítám...</p>
            )}

            {!loading && companies.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">
                  {cityFilter
                    ? `Žádné firmy v obci „${cityFilter}"`
                    : "Žádné firmy v databázi. Vyhledejte firmy pro naplnění katalogu."}
                </p>
              </div>
            )}

            {companies.map((company) => (
              <CompanyCard
                key={company.ico}
                ico={company.ico}
                name={company.name}
                address={company.address}
                city={company.city}
              />
            ))}

            {results && results.total > results.pageSize && (
              <Pagination
                page={currentPage}
                total={results.total}
                pageSize={results.pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
