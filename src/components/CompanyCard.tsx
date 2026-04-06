"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface StatutoryMember {
  firstName?: string | null;
  lastName?: string | null;
  titleBefore?: string | null;
  titleAfter?: string | null;
  role?: string | null;
}

interface Shareholder {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  shareholderIco?: string | null;
  shareText?: string | null;
}

interface CompanyCardProps {
  ico: string;
  name: string;
  address: string;
  city: string;
}

interface CompanyDetailData {
  statutoryMembers: StatutoryMember[];
  shareholders: Shareholder[];
  legalForm?: string | null;
  dateCreated?: string | null;
  status?: string | null;
}

function formatPersonName(person: {
  titleBefore?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  titleAfter?: string | null;
}): string {
  const parts = [
    person.titleBefore,
    person.firstName,
    person.lastName,
    person.titleAfter ? `, ${person.titleAfter}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

export function CompanyCard({ ico, name, address, city }: CompanyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<CompanyDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (!detail) {
      setLoading(true);
      try {
        const res = await fetch(`/api/company?ico=${ico}`);
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
        }
      } catch (err) {
        console.error("Failed to fetch detail:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="border rounded-lg bg-white hover:shadow-sm transition-shadow cursor-pointer"
      onClick={handleToggle}
    >
      {/* Collapsed view */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
            <Badge variant="secondary" className="shrink-0 font-mono text-xs">
              IČO: {ico}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{address}</p>
        </div>
        <div className="ml-4 text-gray-400">
          <svg
            className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div
          className="border-t px-4 pb-4 pt-3 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {loading && (
            <p className="text-sm text-gray-400">Načítám podrobnosti...</p>
          )}

          {detail && (
            <>
              {/* Jednatelia / Statutory Members */}
              {detail.statutoryMembers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Jednatelé / Statutární orgán
                  </h4>
                  <ul className="space-y-1">
                    {detail.statutoryMembers.map((m, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span>{formatPersonName(m)}</span>
                        {m.role && (
                          <span className="text-gray-400 text-xs">
                            — {m.role}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Spoločníci / Shareholders */}
              {detail.shareholders.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Společníci
                  </h4>
                  <ul className="space-y-1">
                    {detail.shareholders.map((s, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        <span>
                          {s.companyName ||
                            formatPersonName({
                              firstName: s.firstName,
                              lastName: s.lastName,
                            })}
                        </span>
                        {s.shareText && (
                          <span className="text-gray-400 text-xs">
                            — {s.shareText}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.statutoryMembers.length === 0 &&
                detail.shareholders.length === 0 && (
                  <p className="text-sm text-gray-400">
                    Žádné podrobnosti k dispozici z veřejného rejstříku.
                  </p>
                )}
            </>
          )}

          {!loading && !detail && (
            <p className="text-sm text-red-400">
              Nepodařilo se načíst podrobnosti.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
