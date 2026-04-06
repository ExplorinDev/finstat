"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 w-full">
      <Input
        type="text"
        placeholder="Zadejte název firmy nebo IČO..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 h-12 text-base"
      />
      <Button
        type="submit"
        disabled={isLoading || query.trim().length < 2}
        className="h-12 px-8"
      >
        {isLoading ? "Hledám..." : "Hledat"}
      </Button>
    </form>
  );
}
