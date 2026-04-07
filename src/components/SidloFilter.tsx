"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface SidloFilterProps {
  cities: string[];
  cityFilter: string;
  onCityChange: (city: string) => void;
}

export function SidloFilter({
  cities,
  cityFilter,
  onCityChange,
}: SidloFilterProps) {
  const [inputValue, setInputValue] = useState(cityFilter);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Debounce the actual search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onCityChange(value);
    }, 400);
  };

  const handleCheckbox = (city: string, checked: boolean | string) => {
    if (checked) {
      setInputValue(city);
      onCityChange(city);
    } else {
      setInputValue("");
      onCityChange("");
    }
  };

  const handleClear = () => {
    setInputValue("");
    onCityChange("");
  };

  // Filter checkbox list by what's typed
  const filteredCities = inputValue
    ? cities.filter((c) =>
        c.toLowerCase().includes(inputValue.toLowerCase())
      )
    : cities;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
        Sídlo
      </h3>
      <Input
        type="text"
        placeholder="Hledat obec..."
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        className="h-9 text-sm"
      />
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredCities.length === 0 && cities.length === 0 && (
          <p className="text-xs text-gray-400">
            Zatím žádné obce v databázi
          </p>
        )}
        {filteredCities.length === 0 && cities.length > 0 && (
          <p className="text-xs text-gray-400">Žádná obec nenalezena</p>
        )}
        {filteredCities.map((city) => (
          <label
            key={city}
            className="flex items-center gap-2 cursor-pointer text-sm hover:text-gray-900"
          >
            <Checkbox
              checked={cityFilter === city}
              onCheckedChange={(checked) => handleCheckbox(city, checked)}
            />
            <span>{city}</span>
          </label>
        ))}
      </div>
      {(cityFilter || inputValue) && (
        <button
          onClick={handleClear}
          className="text-xs text-blue-600 hover:underline"
        >
          Zrušit filtr
        </button>
      )}
    </div>
  );
}
