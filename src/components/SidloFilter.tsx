"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface SidloFilterProps {
  cities: string[];
  selected: string | null;
  onSelect: (city: string | null) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
}

export function SidloFilter({
  cities,
  selected,
  onSelect,
  searchText,
  onSearchChange,
}: SidloFilterProps) {
  const filteredCities = cities.filter((city) =>
    city.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCheckbox = (city: string, checked: boolean | string) => {
    if (checked) {
      onSearchChange(city);
      onSelect(city);
    } else {
      onSearchChange("");
      onSelect(null);
    }
  };

  const handleInputChange = (value: string) => {
    onSearchChange(value);
    // Clear exact checkbox selection when typing freely
    if (selected && selected.toLowerCase() !== value.toLowerCase()) {
      onSelect(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
        Sídlo
      </h3>
      <Input
        type="text"
        placeholder="Hledat obec..."
        value={searchText}
        onChange={(e) => handleInputChange(e.target.value)}
        className="h-9 text-sm"
      />
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredCities.length === 0 && cities.length === 0 && (
          <p className="text-xs text-gray-400">
            Vyhledejte firmy pro zobrazení obcí
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
              checked={selected === city}
              onCheckedChange={(checked) => handleCheckbox(city, checked)}
            />
            <span>{city}</span>
          </label>
        ))}
      </div>
      {(selected || searchText) && (
        <button
          onClick={() => {
            onSelect(null);
            onSearchChange("");
          }}
          className="text-xs text-blue-600 hover:underline"
        >
          Zrušit filtr
        </button>
      )}
    </div>
  );
}
