"use client";

import { useState } from "react";
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

export default function Home() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState("");

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

  const handleSearch = (query: string) => {
    setSelectedCity(null);
    setCitySearch("");
    doSearch(query, 0);
  };

  const handlePageChange = (page: number) => {
    doSearch(currentQuery, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const displayedCompanies = results
    ? selectedCity
      ? results.companies.filter(
          (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
        )
      : citySearch
        ? results.companies.filter((c) =>
            c.city.toLowerCase().includes(citySearch.toLowerCase())
          )
        : results.companies
    : [];

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
              selected={selectedCity}
              onSelect={setSelectedCity}
              searchText={citySearch}
              onSearchChange={setCitySearch}
            />
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-3">
            {!results && !loading && !error && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">Zadejte název firmy nebo IČO pro vyhledávání</p>
              </div>
            )}

            {results && displayedCompanies.length === 0 && !loading && (
              <p className="text-gray-400 text-center py-10">
                Žádné výsledky
              </p>
            )}

            {displayedCompanies.map((company) => (
              <CompanyCard
                key={company.ico}
                ico={company.ico}
                name={company.name}
                address={company.address}
                city={company.city}
              />
            ))}

            {results && !selectedCity && !citySearch && (
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
