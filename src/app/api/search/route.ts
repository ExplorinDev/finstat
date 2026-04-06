import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchCompanies } from "@/lib/ares";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query, city, page = 0 } = body as {
    query: string;
    city?: string;
    page?: number;
  };

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  const pageSize = 50;

  try {
    // Search ARES
    const { total, companies } = await searchCompanies(
      query,
      page * pageSize,
      pageSize
    );

    // Cache results in DB (fire and forget - don't block response)
    for (const c of companies) {
      prisma.company
        .upsert({
          where: { ico: c.ico },
          update: {
            name: c.name,
            address: c.address,
            city: c.city,
            region: c.region || null,
            district: c.district || null,
            cachedAt: new Date(),
          },
          create: {
            ico: c.ico,
            name: c.name,
            address: c.address,
            city: c.city,
            region: c.region || null,
            district: c.district || null,
          },
        })
        .catch(() => {});
    }

    // Apply city filter client-side if provided
    const filtered = city
      ? companies.filter(
          (c) => c.city.toLowerCase() === city.toLowerCase()
        )
      : companies;

    // Extract unique cities for filter sidebar
    const cities = [...new Set(companies.map((c) => c.city).filter(Boolean))].sort();

    return NextResponse.json({
      total,
      companies: filtered,
      cities,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Search error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to search companies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
