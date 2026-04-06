"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(totalPages - 1, page + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        ←
      </Button>

      {start > 0 && (
        <>
          <Button variant="outline" size="sm" onClick={() => onPageChange(0)}>
            1
          </Button>
          {start > 1 && <span className="text-gray-400 px-1">...</span>}
        </>
      )}

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(p)}
        >
          {p + 1}
        </Button>
      ))}

      {end < totalPages - 1 && (
        <>
          {end < totalPages - 2 && (
            <span className="text-gray-400 px-1">...</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages - 1)}
          >
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        →
      </Button>

      <span className="text-sm text-gray-400 ml-2">
        {total} výsledků
      </span>
    </div>
  );
}
